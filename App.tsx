
import React, { useState, useEffect } from 'react';
import type { UserProfile, Book, Page, UserStatus } from './types';
import { mockUsers, mockBooks } from './services/mockData';

// Dynamically import components to keep App.tsx clean
import { LandingPage } from './components/LandingPage';
import { AuthPage } from './components/AuthPage';
import { AwaitingActivationPage } from './components/AwaitingActivationPage';
import { DashboardPage } from './components/DashboardPage';
import { CreateBookPage } from './components/CreateBookPage';
import { UserManagementPage } from './components/admin/UserManagementPage';
import { SettingsPage } from './components/admin/SettingsPage';

const App: React.FC = () => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [page, setPage] = useState<Page>('landing');
    const [users, setUsers] = useState<UserProfile[]>(mockUsers);
    const [books, setBooks] = useState<Book[]>(mockBooks);
    const [apiKey, setApiKey] = useState<string | null>(() => localStorage.getItem('geminiApiKey'));


    useEffect(() => {
        const loggedInUser = localStorage.getItem('user');
        if (loggedInUser) {
            const parsedUser = JSON.parse(loggedInUser);
            const fullUser = users.find(u => u.id === parsedUser.id);
            if(fullUser) {
                setUser(fullUser);
                handleNavigation(fullUser);
            }
        }
    }, [users]); // Rerun if users data changes (e.g. admin action)

    const handleNavigation = (currentUser: UserProfile) => {
        if (currentUser.role === 'admin') {
            setPage('dashboard');
            return;
        }
        switch (currentUser.status) {
            case 'ativa':
                setPage('dashboard');
                break;
            case 'pendente':
            case 'suspensa':
                setPage('awaiting-activation');
                break;
            default:
                setPage('login');
                break;
        }
    };

    const handleLogin = (loggedInUser: UserProfile) => {
        localStorage.setItem('user', JSON.stringify(loggedInUser));
        setUser(loggedInUser);
        handleNavigation(loggedInUser);
    };

    const handleRegister = (newUser: UserProfile) => {
        setUsers(prev => [...prev, newUser]); // Add to mock DB
        localStorage.setItem('user', JSON.stringify(newUser));
        setUser(newUser);
        setPage('awaiting-activation');
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

    const handleUpdateUserStatus = (userId: string, newStatus: UserStatus) => {
        setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, status: newStatus } : u));
        console.log(`User ${userId} status updated to ${newStatus}. A welcome email would be sent if status is 'ativa'.`);
    };

    const handleApiKeySave = (key: string) => {
        localStorage.setItem('geminiApiKey', key);
        setApiKey(key);
    };
    
    const handleBookCreated = (newBook: Book, updatedCredits: number) => {
        if (!user) return;
        setBooks(prev => [...prev, newBook]);
        const updatedUser = { ...user, book_credits: updatedCredits };
        setUser(updatedUser);
        setUsers(prevUsers => prevUsers.map(u => u.id === user.id ? updatedUser : u));
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setPage('dashboard');
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
            case 'awaiting-activation':
                 if (user.status === 'pendente' || user.status === 'suspensa') {
                    return <AwaitingActivationPage user={user} onLogout={handleLogout} />;
                 }
                 // If status changed to 'ativa', redirect
                 handleNavigation(user);
                 return null;
            case 'dashboard':
                 if (user.status !== 'ativa') {
                    setPage('awaiting-activation');
                    return null;
                 }
                return <DashboardPage user={user} books={books.filter(b => b.userId === user.id || user.role === 'admin')} onNavigate={handleNavigate} onLogout={handleLogout} />;
            case 'create-book':
                 if (user.status !== 'ativa') {
                    setPage('awaiting-activation');
                    return null;
                 }
                return <CreateBookPage user={user} onBookCreated={handleBookCreated} onNavigate={handleNavigate} apiKey={apiKey}/>;
            case 'admin-users':
                if (user.role !== 'admin') {
                    setPage('dashboard');
                    return null;
                }
                return <UserManagementPage users={users} onUpdateUserStatus={handleUpdateUserStatus} onNavigate={handleNavigate} />;
            case 'admin-settings':
                if (user.role !== 'admin') {
                    setPage('dashboard');
                    return null;
                }
                return <SettingsPage onNavigate={handleNavigate} apiKey={apiKey} onApiKeySave={handleApiKeySave} />;
            default:
                // Fallback to dashboard for logged-in users on unknown pages
                handleNavigation(user);
                return null;
        }
    };

    return <div className="antialiased">{renderPage()}</div>;
};

export default App;
   