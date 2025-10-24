
import React, { useState, useEffect } from 'react';
import type { UserProfile, Book, Page, UserStatus } from './types';
import { mockUsers, mockBooks } from './services/mockData';

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
    const [users, setUsers] = useState<UserProfile[]>(mockUsers);
    const [books, setBooks] = useState<Book[]>(mockBooks);
    const [viewedBookId, setViewedBookId] = useState<string | null>(null);


    useEffect(() => {
        const loggedInUser = localStorage.getItem('user');
        if (loggedInUser) {
            const parsedUser = JSON.parse(loggedInUser);
            // Sync user from state to get updates (e.g. status change by admin)
            const fullUser = users.find(u => u.id === parsedUser.id);
            if(fullUser) {
                setUser(fullUser);
                handleNavigation(fullUser);
            } else {
                // User might have been deleted, log them out
                handleLogout();
            }
        }
    }, [users]); // Rerun if users data changes (e.g. admin action)

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

    const handleLogin = (loggedInUser: UserProfile) => {
        localStorage.setItem('user', JSON.stringify(loggedInUser));
        const fullUser = users.find(u => u.id === loggedInUser.id)!;
        setUser(fullUser);
        handleNavigation(fullUser);
    };

    const handleRegister = (newUser: UserProfile) => {
        setUsers(prev => [...prev, newUser]); // Add to mock DB
        localStorage.setItem('user', JSON.stringify(newUser));
        setUser(newUser);
        setPage('awaiting-activation'); // Redirect to waiting page
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        setUser(null);
        setPage('landing');
    };
    
    const handleNavigate = (newPage: Page) => {
        if (newPage.startsWith('admin-') && user?.role !== 'admin') {
            // Protect admin routes
            setPage('dashboard');
            return;
        }
        setPage(newPage);
    };

    const handleUpdateUserStatus = (userId: string, newStatus: 'suspensa') => {
        setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, status: newStatus } : u));
        console.log(`User ${userId} status updated to ${newStatus}.`);
    };

    const handleActivateUser = (userId: string, plan: 'pro' | 'free') => {
        setUsers(prevUsers => prevUsers.map(u => {
            if (u.id === userId) {
                return {
                    ...u,
                    status: plan === 'pro' ? 'ativa_pro' : 'ativa_free',
                    book_credits: plan === 'pro' ? 10 : 1,
                };
            }
            return u;
        }));
    };
    
    const handleBookCreated = (newBook: Book, updatedCredits: number) => {
        if (!user) return;
        setBooks(prev => [...prev, newBook]);

        let updatedUser: UserProfile = { ...user, book_credits: updatedCredits };
        
        // If it was a free user creating their first book, set their IP
        if (user.status === 'ativa_free') {
            updatedUser = { ...updatedUser, first_book_ip: '123.45.67.89' }; // Mock IP
        }

        setUser(updatedUser);
        setUsers(prevUsers => prevUsers.map(u => u.id === user.id ? updatedUser : u));
        localStorage.setItem('user', JSON.stringify(updatedUser));
        // Do not navigate away, let the user download the book first.
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

            const mockUserIp = '123.45.67.89';
            
            // Check if another free user with the same IP has already created a book.
            const ipInUse = users.some(u => 
                u.id !== user.id &&
                u.status === 'ativa_free' &&
                u.first_book_ip === mockUserIp
            );

            if (ipInUse) {
                return { allow: false, message: "Limite de livros gratuitos por IP excedido. Faça upgrade para criar mais." };
            }
        }
        
        return { allow: true, message: "" };
    };

    const renderPage = () => {
        if (!user) {
            switch (page) {
                case 'login':
                    return <AuthPage onLogin={handleLogin} onRegister={handleRegister} />;
                default:
                    return <LandingPage onNavigate={handleNavigate} />;
            }
        }

        // Protected routes from here
        switch (page) {
            case 'suspended-account':
                 if (user.status === 'suspensa') {
                    return <SuspendedAccountPage onLogout={handleLogout} />;
                 }
                 handleNavigation(user);
                 return null;
            case 'awaiting-activation':
                if (user.status === 'aguardando_ativacao') {
                    return <AwaitingActivationPage user={user} onLogout={handleLogout} />;
                }
                handleNavigation(user);
                return null;
            case 'dashboard':
                 if (user.status === 'suspensa' || user.status === 'aguardando_ativacao') {
                    handleNavigation(user);
                    return null;
                 }
                return <DashboardPage user={user} books={books.filter(b => b.userId === user.id || user.role === 'admin')} onNavigate={handleNavigate} onLogout={handleLogout} onViewBook={handleViewBook} />;
            case 'create-book':
                 if (user.status !== 'ativa_pro' && user.status !== 'ativa_free') {
                    handleNavigation(user);
                    return null;
                 }
                return <CreateBookPage user={user} onBookCreated={handleBookCreated} onNavigate={handleNavigate} onBeforeGenerate={handleBeforeGenerate} />;
            case 'view-book':
                const bookToView = books.find(b => b.id === viewedBookId);
                 if (user.status !== 'ativa_pro' && user.status !== 'ativa_free') {
                    handleNavigation(user);
                    return null;
                 }
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
                // Fallback to dashboard for logged-in users on unknown pages
                handleNavigation(user);
                return null;
        }
    };

    return <div className="antialiased">{renderPage()}</div>;
};

export default App;