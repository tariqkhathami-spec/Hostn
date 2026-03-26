'use client';

import { useState, useEffect } from 'react';
import { useAuth } from 'A/context/AuthContext';
import { useRouter } from 'next/navigation';
import Header from 'A/components/layout/Header';
import Footer from 'A/components/layout/Footer';
import { supportApi } from 'A/lib/api';
import { SupportTicket, TicketCategory, TicketPriority } from 'A/types';
