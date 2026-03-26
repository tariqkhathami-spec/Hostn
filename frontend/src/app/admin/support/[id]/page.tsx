'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supportApi } from '@/lib/api';
import { SupportTicket } from '@/types';
