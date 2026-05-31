import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase';
import { AuthContext } from '../context/AuthContext';
import Animated, { FadeInDown, FadeInUp, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as DocumentPicker from 'expo-document-picker';

export default function CreateDeckScreen({ navigation }) {
  const { session } = useContext(AuthContext);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Bouncy button animation
  const buttonScale = useSharedValue(1);
  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }]
  }));

  const handlePressIn = () => { buttonScale.value = withSpring(0.95); };
  const handlePressOut = () => { buttonScale.value = withSpring(1); };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPdfFile(result.assets[0]);
        setNotes(''); 
        setErrorMessage('');
      }
    } catch (err) {
      console.log('Error picking document', err);
      setErrorMessage('Failed to pick document');
    }
  };

  const handleGenerate = async () => {
    if (!title.trim()) {
      setErrorMessage('Please give your deck a fun title!');
      return;
    }
    if (!notes.trim() && !pdfFile) {
      setErrorMessage('We need either some text or a PDF to generate magic!');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      let apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      if (Platform.OS === 'web') {
        apiUrl = 'http://127.0.0.1:8000';
      }

      let response;

      if (pdfFile) {
        const formData = new FormData();
        if (Platform.OS === 'web') {
           const res = await fetch(pdfFile.uri);
           const blob = await res.blob();
           formData.append('file', blob, pdfFile.name);
        } else {
           formData.append('file', {
             uri: pdfFile.uri,
             name: pdfFile.name,
             type: 'application/pdf'
           });
        }

        response = await fetch(`${apiUrl}/api/generate-pdf`, {
          method: 'POST',
          body: formData,
        });
      } else {
        response = await fetch(`${apiUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: notes }),
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Oops: ${response.status} - ${errorText}`);
      }

      const flashcards = await response.json();

      if (!Array.isArray(flashcards) || flashcards.length === 0) {
        throw new Error('AI was too sleepy to return flashcards. Try again!');
      }

      const { data: deckData, error: deckError } = await supabase
        .from('decks')
        .insert([{ title: title, user_id: session.user.id }])
        .select()
        .single();

      if (deckError) throw deckError;

      const cardsToInsert = flashcards.map(card => ({
        deck_id: deckData.id,
        question: card.question,
        answer: card.answer
      }));

      const { error: cardsError } = await supabase
        .from('flashcards')
        .insert(cardsToInsert);

      if (cardsError) throw cardsError;

      if (Platform.OS === 'web') {
        window.alert(`Awesome! Generated ${flashcards.length} flashcards! 🎉`);
      } else {
        Alert.alert('Awesome!', `Generated ${flashcards.length} flashcards! 🎉`);
      }
      navigation.replace('Player', { deckId: deckData.id, deckTitle: deckData.title });

    } catch (error) {
      console.error('Generation error:', error);
      setErrorMessage(error.message || 'Something went wrong during generation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-900 pt-16 px-6">
      <Animated.View entering={FadeInDown.duration(400)} className="flex-row items-center mb-10">
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          className="mr-5 bg-slate-800 p-3 rounded-2xl border-b-4 border-x-2 border-t-2 border-slate-700 active:border-b-2 active:mt-1"
          activeOpacity={1}
        >
          <Ionicons name="close-outline" size={28} color="#94a3b8" />
        </TouchableOpacity>
        <Text className="text-white text-3xl font-black tracking-tight flex-1">New Deck</Text>
      </Animated.View>

      <Animated.ScrollView 
        entering={FadeInUp.duration(600).springify()}
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        <Text className="text-slate-400 font-black uppercase tracking-widest text-sm mb-3 ml-2">Deck Title</Text>
        <View className="bg-slate-800 rounded-3xl mb-10 border-b-8 border-x-2 border-t-2 border-slate-700 overflow-hidden">
            <TextInput
              className="text-white text-2xl font-bold p-6 m-0"
              placeholder="e.g. Brain Anatomy 🧠"
              placeholderTextColor="#64748b"
              value={title}
              onChangeText={setTitle}
            />
        </View>

        <Text className="text-slate-400 font-black uppercase tracking-widest text-sm mb-3 ml-2">Source Material</Text>
        
        {/* PDF Upload Button */}
        <TouchableOpacity 
          onPress={pickDocument}
          className={`flex-row items-center p-5 rounded-3xl mb-8 border-b-8 border-x-2 border-t-2 active:border-b-4 active:mt-1 ${pdfFile ? 'border-emerald-700 bg-emerald-500/20' : 'border-blue-700 bg-slate-800'}`}
          activeOpacity={1}
        >
          <View className={`w-16 h-16 rounded-2xl justify-center items-center mr-5 ${pdfFile ? 'bg-emerald-500' : 'bg-blue-500'}`}>
            <Ionicons name={pdfFile ? "document-text" : "cloud-upload"} size={32} color="white" />
          </View>
          <View className="flex-1">
            <Text className={`font-black text-xl mb-1 ${pdfFile ? 'text-emerald-400' : 'text-white'}`}>
              {pdfFile ? 'PDF Selected!' : 'Upload PDF'}
            </Text>
            <Text className="text-slate-400 font-bold text-sm" numberOfLines={1}>
              {pdfFile ? pdfFile.name : 'Tap to browse files'}
            </Text>
          </View>
          {pdfFile && (
            <TouchableOpacity onPress={(e) => { e.stopPropagation(); setPdfFile(null); }} className="p-2 ml-2">
               <Ionicons name="close-circle" size={32} color="#ef4444" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        <View className="flex-row items-center mb-8">
          <View className="flex-1 h-1 bg-slate-800 rounded-full" />
          <Text className="text-slate-500 font-black px-4 text-sm uppercase">OR PASTE TEXT</Text>
          <View className="flex-1 h-1 bg-slate-800 rounded-full" />
        </View>

        <TextInput
          className={`bg-slate-800 text-white px-6 py-6 rounded-3xl border-b-8 border-x-2 border-t-2 mb-10 min-h-[160px] text-lg font-bold ${pdfFile ? 'opacity-40 border-slate-700' : 'border-slate-700 focus:border-blue-500 focus:bg-slate-800'}`}
          placeholder={pdfFile ? "Text disabled while PDF is selected" : "Paste your lecture notes here..."}
          placeholderTextColor="#64748b"
          multiline
          textAlignVertical="top"
          value={notes}
          onChangeText={(val) => {
            setNotes(val);
            if(val) setPdfFile(null);
          }}
          editable={!pdfFile}
        />

        {errorMessage ? (
          <View className="bg-rose-500/20 border-l-8 border-rose-500 rounded-2xl p-5 mb-8">
            <Text className="text-rose-400 font-bold text-lg">{errorMessage}</Text>
          </View>
        ) : null}

        {/* Create Magic Button - Smaller, centered, proper styling */}
        <Animated.View style={buttonStyle} className="items-center mb-10">
          <TouchableOpacity 
            className="bg-blue-500 py-5 px-10 rounded-full flex-row justify-center items-center border-b-8 border-x-2 border-t-2 border-blue-700 active:border-b-2 active:mt-1.5 shadow-lg"
            onPress={handleGenerate}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={loading}
            activeOpacity={1}
          >
            {loading ? (
              <>
                <ActivityIndicator color="white" className="mr-3" />
                <Text className="text-white font-black text-2xl tracking-wide">Generating...</Text>
              </>
            ) : (
              <>
                <Ionicons name="sparkles" size={28} color="white" className="mr-3" />
                <Text className="text-white font-black text-2xl tracking-wide">Create Magic!</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </Animated.ScrollView>
    </View>
  );
}
