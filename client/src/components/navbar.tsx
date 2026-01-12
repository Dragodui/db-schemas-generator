'use client';

import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { Button } from './ui/button';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const { user, isAuthenticated, logout, loading } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 items-center">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-bold text-gray-900 dark:text-white">
              DB Schema Generator
            </Link>
            {isAuthenticated && (
              <Link
                href="/dashboard"
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                My Schemas
              </Link>
            )}
          </div>

          <div className="flex items-center gap-3">
            {loading ? (
              <div className="w-20 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ) : isAuthenticated ? (
              <>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {user?.name}
                </span>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="outline" size="sm">Sign In</Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">Sign Up</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
