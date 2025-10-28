

import React, { useState, useEffect, useRef } from 'react';
import type { UserProfile, Book, Page } from './types';
import { supabase } from './services/supabase';

// Dynamically import components to keep App.tsx clean
import { LandingPage } from './components/LandingPage';
import { AuthPage } from './components/AuthPage';
import { SuspendedAccountPage } from './components/SuspendedAccountPage';
import { AwaitingActivationPage } from './components/AwaitingActivationPage';
import { DashboardPage } from './components/DashboardPage';
import { CreateBookPage } from './components/CreateBookPage';
import { UserManagementPage } from './components/admin/UserManagementPage';
import { SettingsPage } from './components/admin/SettingsPage';
import { ActivationPage } from './components/admin/ActivationPage';
import { ViewBookPage } from './components/ViewBookPage';
import { LoadingSpinner } from './components/ui/LoadingSpinner';

// FIX: Changed 'Promise<T>' to 'PromiseLike<T>'. Supabase's query builders return a 'thenable' object which is not a full Promise. This change makes the function's type signature compatible, allowing TypeScript to correctly infer the return type of the promise and fix the destructuring error.
const promiseWithTimeout = <T,>(
  promise: PromiseLike<T>,
  ms: number,
  timeoutError = new Error('Promise timed out')
): Promise<T> => {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(timeoutError);
    }, ms);
  });
  return Promise.race([promise, timeout]);
};


const App: React.FC = () => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [page, setPage] = useState<Page>('landing');
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [books, setBooks] = useState<Book[]>([]);
    const [viewedBookId, setViewedBookId] = useState<string | null>(null);
    const [authError, setAuthError] = useState<string | null>(null);
    const initialAuthCheckCompleted = useRef(false);

    const handleNavigation = (currentUser: UserProfile) => {
        if (currentUser.role === 'admin') {
            setPage('dashboard');
            return;
        }
        switch (currentUser.status) {
            case 'ativa_pro':
            case 'ativa_free':
                setPage('dashboard');
                break;
            case 'suspensa':
                setPage('suspended-account');
                break;
            case 'aguardando_ativacao':
                setPage('awaiting-activation');
                break;
            default:
                // This case should ideally not be reached if statuses are correct
                console.warn(`Unhandled user status: ${currentUser.status}. Defaulting to login.`);
                setPage('login');
                break;
        }
    };
    
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
             // On the initial page load, onAuthStateChange fires with the current session.
            // We want to ignore this to always show the landing page first.
            if (!initialAuthCheckCompleted.current) {
                initialAuthCheckCompleted.current = true;
                setUser(null);
                setPage('landing');
                return;
            }

            // After the initial load, we process auth changes (manual login/logout).
            try {
                if (session?.user) {
                    const profilePromise = supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', session.user.id)
                        .single();

                    // Timeout remains a good idea for robustness during login attempts
                    const { data: profile, error: profileError } = await promiseWithTimeout(Promise.resolve(profilePromise), 8000);


                    if (profileError || !profile) {
                        console.error("Corrupted session detected or failed to fetch profile. Triggering hard reset.", profileError);
                        window.location.href = '/?force_logout=true';
                        return;
                    }
                    
                    const userWithEmail = { ...profile, email: session.user.email };
                    setUser(userWithEmail);
                    handleNavigation(userWithEmail);

                } else {
                     // This handles logout
                    setUser(null);
                    setPage('landing');
                }
            } catch (e) {
                console.error("Auth check timed out or failed. Defaulting to login page.", e);
                setAuthError("Falha na autenticação. Por favor, tente novamente.");
                setUser(null);
                setPage('login');
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []); 


    useEffect(() => {
        // Fetch data when user logs in
        if (user) {
            fetchBooks();
            if (user.role === 'admin') {
                fetchAllUsers();
            }
        } else {
            // Clear data when user logs out
            setBooks([]);
            setUsers([]);
        }
    }, [user]);

    const fetchBooks = async () => {
        if (!user) return;
        
        let query = supabase.from('books').select('*');

        if (user.role !== 'admin') {
            query = query.eq('user_id', user.id);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) console.error("Error fetching books", error);
        else setBooks(data || []);
    };
    
    const fetchAllUsers = async () => {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, email, status, role, book_credits')
             .order('created_at', { ascending: false });
        
        if (error) {
             console.error("Error fetching users", error);
        } else {
             setUsers(data || []);
        }
    };

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error("Error during sign out:", error);
        }
        // The onAuthStateChange listener will automatically handle the state update (setUser, setPage).
    };
    
    const handleNavigate = (newPage: Page) => {
        if (newPage.startsWith('admin-') && user?.role !== 'admin') {
            setPage('dashboard');
            return;
        }
        setPage(newPage);
    };

    const handleUpdateUserStatus = async (userId: string, newStatus: 'suspensa') => {
       const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', userId);

        if (error) console.error("Error updating user status", error);
        else fetchAllUsers(); // Re-fetch users to update UI
    };

    const handleActivateUser = async (userId: string, plan: 'pro' | 'free') => {
         const { error } = await supabase
            .from('profiles')
            .update({
                status: plan === 'pro' ? 'ativa_pro' : 'ativa_free',
                book_credits: plan === 'pro' ? 10 : 1,
            })
            .eq('id', userId);

        if (error) console.error("Error activating user", error);
        else fetchAllUsers();
    };
    
    const handleBookCreated = async (newBookData: Omit<Book, 'id' | 'created_at'>, updatedCredits: number) => {
        if (!user) return;

        // 1. Insert the new book
        const { data: newBook, error: bookError } = await supabase
            .from('books')
            .insert(newBookData)
            .select()
            .single();

        if (bookError || !newBook) {
            console.error("Error creating book", bookError);
            return; // Exit if book creation fails
        }
        
        // 2. Update user profile (credits)
        const profileUpdate: Partial<UserProfile> = { book_credits: updatedCredits };
        
        const { data: updatedProfile, error: profileError } = await supabase
            .from('profiles')
            .update(profileUpdate)
            .eq('id', user.id)
            .select()
            .single();

        if (profileError || !updatedProfile) {
            console.error("Error updating profile", profileError);
            // Optional: Handle rollback logic for the created book
        } else {
            // 3. Update local state
            setUser({ ...user, ...updatedProfile });
            fetchBooks(); // Re-fetch books to include the new one
        }
    };

     const handleViewBook = (bookId: string) => {
        setViewedBookId(bookId);
        setPage('view-book');
    };

    const handleBeforeGenerate = async (): Promise<{ allow: boolean; message: string }> => {
        if (!user) {
            return { allow: false, message: "Usuário não autenticado." };
        }

        if (user.status === 'ativa_free') {
            if (user.book_credits <= 0) {
                return { allow: false, message: "Limite de um livro gratuito excedido. Faça upgrade para criar mais." };
            }
        }
        
        return { allow: true, message: "" };
    };

    const renderPage = () => {
        if (!user) {
             return page === 'login' ? <AuthPage initialError={authError} /> : <LandingPage onNavigate={handleNavigate} />;
        }

        // Protected routes from here
        switch (page) {
            case 'suspended-account':
                return <SuspendedAccountPage onLogout={handleLogout} />;
            case 'awaiting-activation':
                return <AwaitingActivationPage user={user} onLogout={handleLogout} />;
            case 'dashboard':
                return <DashboardPage user={user} books={books} onNavigate={handleNavigate} onLogout={handleLogout} onViewBook={handleViewBook} />;
            case 'create-book':
                return <CreateBookPage user={user} onBookCreated={handleBookCreated} onNavigate={handleNavigate} onBeforeGenerate={handleBeforeGenerate} />;
            case 'view-book':
                const bookToView = books.find(b => b.id === viewedBookId);
                if (!bookToView) {
                    handleNavigation(user);
                    return <LoadingSpinner />;
                }
                return <ViewBookPage book={bookToView} onNavigate={handleNavigate} />;
            case 'admin-users':
                if (user.role !== 'admin') {
                    handleNavigation(user); return null;
                }
                return <UserManagementPage users={users} onUpdateUserStatus={handleUpdateUserStatus} onNavigate={handleNavigate} />;
            case 'admin-activation':
                if (user.role !== 'admin') {
                    handleNavigation(user); return null;
                }
                return <ActivationPage users={users} onActivateUser={handleActivateUser} onNavigate={handleNavigate} />;
            case 'admin-settings':
                if (user.role !== 'admin') {
                    handleNavigation(user); return null;
                }
                return <SettingsPage onNavigate={handleNavigate} />;
            default:
                // Fallback for any unknown page state after login
                handleNavigation(user);
                return <LoadingSpinner />;
        }
    };

    return <div className="antialiased">{renderPage()}</div>;
};

export default App;