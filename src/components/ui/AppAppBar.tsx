"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

export default function AppAppBar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const menuItems = [
    { label: 'Home', href: '/' },
    { label: 'Twitter', href: 'https://twitter.com/' },
    { label: 'Feedback', href: '/UI/FeedbackForm' },
  ];

  const profileItems = [
    { label: 'Principal Registration', href: '/' },
    { label: 'Principal Login', href: '/Principal/login' },
    { label: 'Teacher Login', href: '/Teacher/login' },
  ];

  return (
    <header className="relative left-0 right-0 z-50 w-[100%]">
      <div className="container mx-auto">
        <nav className="flex items-center justify-between bg-[#0f172a] backdrop-blur-lg p-3 pl-5 pr-6 shadow-sm">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold">
              <p className="tracking-tighter text-white">Sankan AI</p>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex space-x-2">
              {menuItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="text-sm text-white hover:text-[#4ade80] px-3 py-2"
                >
                  {item.label}
                </Link>
              ))}
         
            </div>

            <div className="flex items-center space-x-2">
              <Link
                href="/Authentication/login"
                className="text-sm text-white hover:text-[#22c55e] px-3 py-2 rounded-md"
              >
                Join
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-sm bg-black text-white px-4 py-2 rounded-md">
                    Login Profiles
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48">
                  {profileItems.map((item) => (
                    <DropdownMenuItem key={item.label}>
                      <Link href={item.href} className="w-full">
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="text-black hover:text-[#4ade80]"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </nav>

        {/* Mobile Drawer */}
        {isMenuOpen && (
          <div className="fixed inset-0 top-24 bg-white z-40 md:hidden">
            <div className="container mx-auto px-4 py-6">
              <div className="flex flex-col space-y-4">
                {menuItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={toggleMenu}
                    className="text-lg text-black hover:text-black"
                  >
                    {item.label}
                  </Link>
                ))}
                
                {/* Mobile Profiles Menu */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-500">Login Profiles</p>
                  {profileItems.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={toggleMenu}
                      className="block text-lg text-black hover:text-black pl-4"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
                
                <div className="border-t pt-4 space-y-4">
                  <Link
                    href="/Authentication/login"
                    onClick={toggleMenu}
                    className="block text-lg text-black hover:text-black"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/Authentication/Signup"
                    onClick={toggleMenu}
                    className="block text-lg bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors text-center"
                  >
                    Sign Up
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}