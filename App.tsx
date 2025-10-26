

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
import { LoadingSpinner } from './components/ui/LoadingSpinner';

const App: React.FC = () => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [page, setPage] = useState<Page>('landing');
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [books, setBooks] = useState<Book[]>([]);
    const [viewedBookId, setViewedBookId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);


    useEffect(() => {
        setLoading(true);

        try {
            localStorage.setItem('__test', '1');
            localStorage.removeItem('__test');
        } catch (e) {
            console.error("LocalStorage is not available.", e);
            setAuthError("Seu navegador parece estar bloqueando o armazenamento de dados, o que impede o login. Por favor, verifique as configurações de privacidade do seu navegador.");
            setLoading(false);
            setPage('login');
            setUser(null);
            return;
        }

        const loadingTimeout = setTimeout(() => {
            if (loading) {
                console.warn('App loading timed out. Forcing navigation to login page.');
                setLoading(false);
                setPage('login');
                setUser(null);
                setAuthError("A verificação da sessão demorou muito. Por favor, tente fazer o login novamente.");
            }
        }, 10000);

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            clearTimeout(loadingTimeout);
            setAuthError(null);

            try {
                if (!session?.user) {
                    setUser(null);
                    setPage('landing');
                    return;
                }

                const fetchProfileWithRetry = async (userId: string, attempts = 4, delay = 500) => {
                    for (let i = 0; i < attempts; i++) {
                        const { data: profile, error } = await supabase
                            .from('profiles')
                            .select('*')
                            .eq('id', userId)
                            .single();

                        if (profile) return profile;
                        
                        const isNotFoundError = error && error.code === 'PGRST116';
                        if (!isNotFoundError || i === attempts - 1) {
                            console.error(`Falha ao buscar perfil (tentativa ${i + 1}/${attempts}):`, error);
                            return null;
                        }
                        
                        await new Promise(res => setTimeout(res, delay * (i + 1)));
                    }
                    return null;
                };
                
                const profile = await fetchProfileWithRetry(session.user.id);
                
                if (profile) {
                    const userWithEmail = { ...profile, email: session.user.email };
                    setUser(userWithEmail);
                    handleNavigation(userWithEmail);
                } else {
                    console.error("Não foi possível buscar o perfil do usuário. A sessão pode estar corrompida. Deslogando forçadamente.");
                    await supabase.auth.signOut();
                }
            } catch (error) {
                console.error("Erro crítico durante a verificação de autenticação:", error);
                setAuthError("Ocorreu um erro ao verificar sua sessão. Por favor, faça o login novamente.");
                await supabase.auth.signOut();
                setPage('login');
            } finally {
                setLoading(false);
            }
        });

        return () => {
            subscription.unsubscribe();
            clearTimeout(loadingTimeout);
        };
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
            .select('id, email, status, role, book_credits, first_book_ip')
             .order('created_at', { ascending: false });
        
        if (error) {
             console.error("Error fetching users", error);
        } else {
             setUsers(data || []);
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
        setLoading(true);
        try {
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error("Erro ao fazer logout no Supabase:", error);
                setAuthError("Não foi possível fazer o logout do servidor. Limpando sessão local.");
            }
        } catch (e) {
            console.error("Erro inesperado durante o logout:", e);
            setAuthError("Ocorreu um erro inesperado durante o logout.");
        } finally {
            setUser(null);
            setBooks([]);
            setUsers([]);
            setPage('landing');
            setLoading(false);
        }
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
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-100">
                    <LoadingSpinner />
                </div>
            );
        }

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