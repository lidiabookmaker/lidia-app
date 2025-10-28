
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
                console.warn(`Unhandled user status: ${currentUser.status}. Defaulting to login.`);
                setPage('login');
                break;
        }
    };
    
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            // This flag prevents auto-login on page load.
            if (!initialAuthCheckCompleted.current) {
                initialAuthCheckCompleted.current = true;
                return; // Ignore the initial session check, forcing the app to stay on the landing page.
            }

            // This code now only runs for explicit login or logout events.
            if (session?.user) {
                setPage('loading'); // Show a temporary spinner while fetching the user's profile.
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                if (profileError || !profile) {
                    console.error("Failed to fetch profile after login:", profileError);
                    await supabase.auth.signOut();
                    setAuthError("Não foi possível carregar seu perfil. Tente novamente.");
                    setPage('login');
                    setUser(null);
                    return;
                }
                
                const userWithEmail = { ...profile, email: session.user.email };
                setUser(userWithEmail);
                handleNavigation(userWithEmail);

            } else {
                 // This handles logout.
                setUser(null);
                setPage('landing');
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []); 


    useEffect(() => {
        if (user) {
            fetchBooks();
            if (user.role === 'admin') {
                fetchAllUsers();
            }
        } else {
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
        if (error) console.error("Error fetching users", error);
        else setUsers(data || []);
    };

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) console.error("Error during sign out:", error);
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
        else fetchAllUsers();
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
        const { data: newBook, error: bookError } = await supabase
            .from('books')
            .insert(newBookData)
            .select()
            .single();
        if (bookError || !newBook) {
            console.error("Error creating book", bookError);
            return;
        }
        const { data: updatedProfile, error: profileError } = await supabase
            .from('profiles')
            .update({ book_credits: updatedCredits })
            .eq('id', user.id)
            .select()
            .single();
        if (profileError || !updatedProfile) {
            console.error("Error updating profile", profileError);
        } else {
            setUser({ ...user, ...updatedProfile });
            fetchBooks();
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
        if (user.status === 'ativa_free' && user.book_credits <= 0) {
            return { allow: false, message: "Limite de um livro gratuito excedido. Faça upgrade para criar mais." };
        }
        return { allow: true, message: "" };
    };

    const renderPage = () => {
        // A dedicated loading state for the brief period after login while fetching profile data.
        if (page === 'loading') {
            return (
                <div className="min-h-screen flex justify-center items-center">
                    <LoadingSpinner />
                </div>
            );
        }

        // If no user is authenticated, only show the landing or login pages.
        // The app starts here by default.
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
                if (user.role !== 'admin') { handleNavigation(user); return null; }
                return <UserManagementPage users={users} onUpdateUserStatus={handleUpdateUserStatus} onNavigate={handleNavigate} />;
            case 'admin-activation':
                if (user.role !== 'admin') { handleNavigation(user); return null; }
                return <ActivationPage users={users} onActivateUser={handleActivateUser} onNavigate={handleNavigate} />;
            case 'admin-settings':
                if (user.role !== 'admin') { handleNavigation(user); return null; }
                return <SettingsPage onNavigate={handleNavigate} />;
            default:
                // Fallback for any unknown or incorrect page state after login.
                handleNavigation(user);
                return <LoadingSpinner />;
        }
    };

    return <div className="antialiased">{renderPage()}</div>;
};

export default App;
