import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { supabase } from '../supabase';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [authError, setAuthError] = useState('');

  async function handleAuth() {
    setAuthError('');
    if (!email || !password) {
      setAuthError('Please enter email and password');
      return;
    }
    setLoading(true);
    let error = null;
    
    if (isLogin) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });
      error = signInError;
    } else {
      const { error: signUpError } = await supabase.auth.signUp({
        email: email,
        password: password,
      });
      error = signUpError;
    }

    if (error) {
      setAuthError(error.message);
    }
    setLoading(false);
  }

  return (
    <View className="flex-1 justify-center items-center bg-slate-900 px-6">
      <Animated.View 
        entering={FadeInDown.duration(600).springify()} 
        className="w-full max-w-md bg-slate-800 p-8 rounded-3xl shadow-xl"
      >
        <Text className="text-4xl font-extrabold text-white text-center mb-2 tracking-tight">
          Cram<Text className="text-blue-500">AI</Text>
        </Text>
        <Text className="text-slate-400 text-center mb-8 font-medium">
          {isLogin ? 'Sign in to access your decks' : 'Create an account to start studying'}
        </Text>

        <View className="space-y-4">
          <TextInput
            className="w-full bg-slate-900 text-white px-4 py-3 rounded-xl border border-slate-700 focus:border-blue-500"
            placeholder="Email address"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            className="w-full bg-slate-900 text-white px-4 py-3 rounded-xl border border-slate-700 focus:border-blue-500"
            placeholder="Password"
            placeholderTextColor="#94a3b8"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {authError ? (
            <View className="bg-red-500/20 border border-red-500 rounded-xl p-3">
              <Text className="text-red-400 font-medium text-center">{authError}</Text>
            </View>
          ) : null}

          <TouchableOpacity 
            className="w-full bg-blue-600 py-4 rounded-xl mt-4 active:bg-blue-700 shadow-lg shadow-blue-500/30 flex-row justify-center items-center"
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-lg text-center">
                {isLogin ? 'Sign In' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          className="mt-6"
          onPress={() => setIsLogin(!isLogin)}
        >
          <Text className="text-blue-400 text-center font-medium">
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}
