import React, { useState, useEffect, useContext } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { supabase } from '../supabase';
import { AuthContext } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInRight, ZoomIn } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const { session } = useContext(AuthContext);
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDecks();
  }, []);

  const fetchDecks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('decks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDecks(data || []);
    } catch (error) {
      console.error('Error fetching decks:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const renderDeck = ({ item, index }) => {
    // Generate a fun color based on index
    const colors = ['bg-indigo-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500', 'bg-cyan-500'];
    const borderColors = ['border-indigo-700', 'border-emerald-700', 'border-rose-700', 'border-amber-700', 'border-cyan-700'];
    const colorClass = colors[index % colors.length];
    const borderClass = borderColors[index % colors.length];

    return (
      <Animated.View entering={FadeInRight.delay(index * 100).springify()} className="mb-4">
        <TouchableOpacity 
          className={`p-5 rounded-3xl border-b-8 border-x-2 border-t-2 ${colorClass} ${borderClass} flex-row justify-between items-center active:border-b-2 active:mt-1.5`}
          onPress={() => navigation.navigate('Player', { deckId: item.id, deckTitle: item.title })}
          activeOpacity={1}
        >
          <View className="flex-1 pr-4">
            <Text className="text-white text-2xl font-extrabold mb-1" numberOfLines={2}>{item.title}</Text>
            <Text className="text-white/80 font-bold text-sm tracking-wider uppercase">
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
          <View className="bg-white/20 p-4 rounded-full">
            <Ionicons name="play" size={28} color="white" />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View className="flex-1 bg-slate-900 pt-16 px-6">
      <View className="flex-row justify-between items-center mb-10">
        <View className="flex-row items-center">
          <View className="bg-blue-500 w-14 h-14 rounded-full justify-center items-center mr-4 border-b-4 border-blue-700">
            <Text className="text-white font-extrabold text-2xl">{session?.user?.email?.charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <Text className="text-slate-400 font-bold text-xs uppercase tracking-widest">Student</Text>
            <Text className="text-white text-2xl font-extrabold">
              {session?.user?.email?.split('@')[0]}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleLogout} className="bg-slate-800 p-3 rounded-full border-b-4 border-slate-700 active:border-b-0 active:mt-1">
          <Ionicons name="log-out-outline" size={24} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {/* Prominent Create Deck Button */}
      <Animated.View entering={FadeInDown.springify()} className="mb-10">
        <TouchableOpacity 
          className="bg-blue-500 p-6 rounded-3xl border-b-8 border-x-2 border-t-2 border-blue-700 flex-row items-center justify-between shadow-lg active:border-b-2 active:mt-1.5"
          onPress={() => navigation.navigate('CreateDeck')}
          activeOpacity={1}
        >
          <View>
            <Text className="text-white text-3xl font-black mb-1">New Deck</Text>
            <Text className="text-blue-100 font-bold text-base">Generate with AI Magic ✨</Text>
          </View>
          <View className="bg-white p-3 rounded-2xl shadow-sm">
            <Ionicons name="add" size={32} color="#3b82f6" />
          </View>
        </TouchableOpacity>
      </Animated.View>

      <Text className="text-slate-400 font-black uppercase tracking-widest text-sm mb-4">Your Study Decks</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#3b82f6" className="mt-10" />
      ) : decks.length === 0 ? (
        <View className="flex-1 justify-center items-center pb-20">
          <View className="bg-slate-800 p-8 rounded-full mb-6 border-b-8 border-slate-700">
             <Ionicons name="school" size={64} color="#64748b" />
          </View>
          <Text className="text-white text-2xl font-bold text-center mb-2">No Decks Yet</Text>
          <Text className="text-slate-400 text-center font-medium px-8 text-base leading-relaxed">Tap the big blue button above to generate your first set of flashcards!</Text>
        </View>
      ) : (
        <FlatList
          data={decks}
          keyExtractor={(item) => item.id}
          renderItem={renderDeck}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshing={loading}
          onRefresh={fetchDecks}
        />
      )}
    </View>
  );
}
