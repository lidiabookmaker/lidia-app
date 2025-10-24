
import React, { useState, useEffect } from 'react';
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

const App: React.FC = () => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [page, setPage] = useState<Page>('landing');
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [books, setBooks] = useState<Book[]>([]);
    const [viewedBookId, setViewedBookId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);


    useEffect(() => {
        setLoading(true);
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();
                
                if (error) {
                    console.error('Error fetching profile:', error);
                    handleLogout();
                } else if (profile) {
                    const userWithEmail = { ...profile, email: session.user.email };
                    setUser(userWithEmail);
                    handleNavigation(userWithEmail);
                }
            } else {
                setUser(null);
                setPage('landing');
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        // Fetch data when user logs in
        if (user) {
            fetchBooks();
            if (user.role === 'admin') {
                fetchAllUsers();
            }
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
            .select('id, status, role, book_credits, first_book_ip, users(email)') // This requires a relationship setup in Supabase or a view
             .order('created_at', { ascending: false });
        
        if (error) {
             console.error("Error fetching users", error);
        } else {
            // Flatten the structure from the join
             const formattedUsers = data.map((u: any) => ({
                id: u.id,
                status: u.status,
                role: u.role,
                book_credits: u.book_credits,
                first_book_ip: u.first_book_ip,
                email: u.users.email,
             }));
             setUsers(formattedUsers || []);
        }
    };


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
                setPage('login');
                break;
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setBooks([]);
        setUsers([]);
        setPage('landing');
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
        
        // 2. Update user profile (credits and IP)
        const profileUpdate: Partial<UserProfile> = { book_credits: updatedCredits };
        if (user.status === 'ativa_free' && !user.first_book_ip) {
            profileUpdate.first_book_ip = '123.45.67.89'; // Mock IP as before
        }
        
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
            
            // This is still a mock, as getting a real IP securely requires a server function.
            // For now, we check if ANY other free user has an IP set.
            const mockUserIp = '123.45.67.89'; 
            
            const { data, error } = await supabase
                .from('profiles')
                .select('id')
                .neq('id', user.id)
                .eq('status', 'ativa_free')
                .eq('first_book_ip', mockUserIp)
                .limit(1);

            if (error) console.error("IP check error", error);

            if (data && data.length > 0) {
                 return { allow: false, message: "Limite de livros gratuitos por IP excedido. Faça upgrade para criar mais." };
            }
        }
        
        return { allow: true, message: "" };
    };

    const renderPage = () => {
        if (loading) {
            return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
        }

        if (!user) {
             return page === 'login' ? <AuthPage /> : <LandingPage onNavigate={handleNavigate} />;
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
                    setPage('dashboard');
                    return null;
                }
                return <ViewBookPage book={bookToView} onNavigate={handleNavigate} />;
            case 'admin-users':
                if (user.role !== 'admin') {
                    setPage('dashboard');
                    return null;
                }
                return <UserManagementPage users={users} onUpdateUserStatus={handleUpdateUserStatus} onNavigate={handleNavigate} />;
            case 'admin-activation':
                if (user.role !== 'admin') {
                    setPage('dashboard');
                    return null;
                }
                return <ActivationPage users={users} onActivateUser={handleActivateUser} onNavigate={handleNavigate} />;
            case 'admin-settings':
                if (user.role !== 'admin') {
                    setPage('dashboard');
                    return null;
                }
                return <SettingsPage onNavigate={handleNavigate} />;
            default:
                // Fallback to determined route for logged-in users
                handleNavigation(user);
                return null;
        }
    };

    return <div className="antialiased">{renderPage()}</div>;
};

export default App;
