import React, { useEffect } from 'react';
import { Linking } from 'react-native';
import { useRouter } from 'expo-router';

const BLOG_URL = 'https://hostn.co/blog';

export default function BlogScreen() {
  const router = useRouter();

  useEffect(() => {
    // Open blog in external browser and go back
    Linking.openURL(BLOG_URL);
    router.back();
  }, []);

  return null;
}
