import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginModel from '../models/LoginModel';
import { router } from 'expo-router';

const useLoginViewModel = (type: string) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [saveCredentials, setSaveCredentials] = useState(false);
  const loginModel = new LoginModel();

  useEffect(() => {
    const loadCredentials = async () => {
      const savedEmail = await AsyncStorage.getItem('email');
      const savedPassword = await AsyncStorage.getItem('password');
      const savedFlag = await AsyncStorage.getItem('saveCredentials');

      if (savedEmail) setEmail(savedEmail);
      if (savedPassword) setPassword(savedPassword);
      if (savedFlag) setSaveCredentials(JSON.parse(savedFlag)); // Parse to boolean
    };

    if (type === 'login') {
      loadCredentials();
    }
  }, [type]);

  const handleSaveCredentialsToggle = async (value: boolean) => {
    setSaveCredentials(value);
    await AsyncStorage.setItem('saveCredentials', JSON.stringify(value));
  };

  const signIn = async () => {
    setLoading(true);
    try {
      const user = await loginModel.signIn(email, password);

      if (user) {
        const uid = user.user.uid;
        const fetchedUsername = await loginModel.fetchUsername(uid);
        if (fetchedUsername) {
          setUsername(fetchedUsername);
          await AsyncStorage.setItem('username', fetchedUsername);
        }

        if (saveCredentials) {
          await AsyncStorage.setItem('email', email);
          await AsyncStorage.setItem('password', password);
        } else {
          await AsyncStorage.removeItem('email');
          await AsyncStorage.removeItem('password');
        }

        router.replace('/routes');
      }
    } catch (error: any) {
      console.log(error);
      alert('Sign in failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async () => {
    setLoading(true);
    try {
      const user = await loginModel.signUp(email, password, username);

      if (user) {
        const uid = user.user.uid;
        const fetchedUsername = await loginModel.fetchUsername(uid);
        if (fetchedUsername) {
          setUsername(fetchedUsername);
          await AsyncStorage.setItem('username', fetchedUsername);
        }

        router.replace('/routes');
      }
    } catch (error: any) {
      console.log(error);
      alert('Sign up failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    email,
    setEmail,
    username,
    setUsername,
    password,
    setPassword,
    saveCredentials,
    handleSaveCredentialsToggle,
    signIn,
    signUp,
    isLogin: type === 'login',
  };
};

export default useLoginViewModel;
