'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from 'A/context/AuthContext';
import { useRouter } from 'next/navigation';
import Header from 'A/components/layout/Header';
import Footer from 'A/components/layout/Footer';
import { messagesApi } from 'A/lib/api';
import { Conversation, Message, User } from 'A/types';
