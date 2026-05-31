import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Dimensions, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  runOnJS
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { supabase } from '../supabase';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

export default function PlayerScreen({ route, navigation }) {
  const { deckId, deckTitle } = route.params;
  const [flashcards, setFlashcards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Animation values
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(0);
  const flipRotation = useSharedValue(0);

  // Progress tracking
  const totalCards = flashcards.length;
  const progressPercent = totalCards > 0 ? ((currentIndex + 1) / totalCards) * 100 : 0;

  useEffect(() => {
    fetchFlashcards();
  }, []);

  const fetchFlashcards = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('deck_id', deckId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setFlashcards(data || []);
    } catch (error) {
      console.error('Error fetching cards:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFlip = () => {
    if (Math.abs(translateX.value) > 10) return;
    flipRotation.value = withSpring(flipRotation.value === 0 ? 1 : 0);
  };

  const frontAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipRotation.value, [0, 1], [0, 180]);
    const opacity = flipRotation.value > 0.5 ? 0 : 1;
    return {
      transform: [{ rotateY: `${rotateY}deg` }],
      opacity,
      backfaceVisibility: 'hidden',
    };
  });

  const backAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipRotation.value, [0, 1], [180, 360]);
    const opacity = flipRotation.value <= 0.5 ? 0 : 1;
    return {
      transform: [{ rotateY: `${rotateY}deg` }],
      opacity,
      backfaceVisibility: 'hidden',
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: flipRotation.value > 0.5 ? 2 : 0,
    };
  });

  const handleNextCard = (direction) => {
    flipRotation.value = 0;
    setTimeout(() => {
      setCurrentIndex(prev => {
        if (direction === 'next' && prev < flashcards.length - 1) return prev + 1;
        if (direction === 'prev' && prev > 0) return prev - 1;
        return prev;
      });

      translateX.value = 0;
      translateY.value = 0;
      rotation.value = 0;
    }, 150);
  };

  const swipeGesture = Gesture.Pan()
    .onUpdate((event) => {
      // Swiping left (X < 0) -> Prev. Allowed if currentIndex > 0.
      // Swiping right (X > 0) -> Next. Allowed if currentIndex < flashcards.length - 1.
      if ((event.translationX < 0 && currentIndex === 0) ||
        (event.translationX > 0 && currentIndex === flashcards.length - 1)) {
        // Resistance effect at edges
        translateX.value = event.translationX * 0.2;
      } else {
        translateX.value = event.translationX;
      }

      translateY.value = event.translationY * 0.2; // slight vertical movement
      rotation.value = interpolate(translateX.value, [-SCREEN_WIDTH, SCREEN_WIDTH], [-10, 10]);
    })
    .onEnd((event) => {
      if (event.translationX > SWIPE_THRESHOLD && currentIndex < flashcards.length - 1) {
        // Swiped Right - Next
        translateX.value = withSpring(SCREEN_WIDTH * 1.5, { velocity: event.velocityX });
        runOnJS(handleNextCard)('next');
      } else if (event.translationX < -SWIPE_THRESHOLD && currentIndex > 0) {
        // Swiped Left - Prev
        translateX.value = withSpring(-SCREEN_WIDTH * 1.5, { velocity: event.velocityX });
        runOnJS(handleNextCard)('prev');
      } else {
        // Return to center
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        rotation.value = withSpring(0);
      }
    });

  const cardAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotateZ: `${rotation.value}deg` }
      ]
    };
  });

  const nextOpacityStyle = useAnimatedStyle(() => {
    return { opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], 'clamp') };
  });

  const prevOpacityStyle = useAnimatedStyle(() => {
    return { opacity: interpolate(translateX.value, [0, -SWIPE_THRESHOLD], [0, 1], 'clamp') };
  });

  if (loading) {
    return (
      <View className="flex-1 bg-slate-900 justify-center items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (flashcards.length === 0) {
    return (
      <View className="flex-1 bg-slate-900 justify-center items-center px-6">
        <Ionicons name="alert-circle-outline" size={64} color="#64748b" className="mb-4" />
        <Text className="text-white text-xl font-bold text-center">No flashcards found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mt-6 bg-blue-600 px-6 py-3 rounded-full border-b-4 border-blue-800">
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentCard = flashcards[currentIndex];

  return (
    <GestureHandlerRootView className="flex-1 bg-slate-900">
      <View className="flex-1 pt-14 px-6 pb-8">

        {/* Header & Progress Bar */}
        <View className="flex-row items-center mb-10">
          <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 mr-3">
            <Ionicons name="close-outline" size={32} color="#94a3b8" />
          </TouchableOpacity>
          <View className="flex-1 h-5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            <Animated.View
              className="h-full bg-blue-500 rounded-full border-b-4 border-blue-700"
              style={{ width: `${progressPercent}%` }}
            />
          </View>
          <View className="ml-4 justify-center items-center">
            <Text className="text-blue-500 font-extrabold text-lg">{currentIndex + 1} / {totalCards}</Text>
          </View>
        </View>

        {/* Swipe Instructions */}
        <Text className="text-slate-500 text-center font-bold tracking-widest text-xs mb-6 uppercase">
          Swipe Right for Next • Swipe Left for Prev
        </Text>

        {/* Card Stack Area */}
        <View className="flex-1 justify-center items-center">

          {/* Background Card Dummy */}
          {currentIndex < flashcards.length - 1 && (
            <View className="absolute h-full bg-slate-800 rounded-[40px] border border-slate-700 shadow-xl opacity-50 scale-95 -bottom-4" style={{ width: SCREEN_WIDTH - 48 }} />
          )}

          {/* Active Interactive Card */}
          <GestureDetector gesture={swipeGesture}>
            <Animated.View className="h-full z-10" style={[cardAnimatedStyle, { width: SCREEN_WIDTH - 48 }]}>

              <TouchableOpacity activeOpacity={1} onPress={handleFlip} className="flex-1">
                <View className="w-full h-full relative perspective-1000">

                  {/* Front Side */}
                  <Animated.View
                    className="w-full h-full bg-slate-800 rounded-[40px] border-b-8 border-x-2 border-t-2 border-slate-700 p-8 shadow-2xl overflow-hidden"
                    style={frontAnimatedStyle}
                  >
                    <Animated.View style={prevOpacityStyle} className="absolute top-8 right-8 border-4 border-blue-500 rounded-xl px-4 py-2 rotate-[15deg] z-50 bg-slate-900/90">
                      <Text className="text-blue-500 font-extrabold text-xl uppercase tracking-wider">Previous</Text>
                    </Animated.View>
                    <Animated.View style={nextOpacityStyle} className="absolute top-8 left-8 border-4 border-emerald-500 rounded-xl px-4 py-2 rotate-[-15deg] z-50 bg-slate-900/90">
                      <Text className="text-emerald-500 font-extrabold text-xl uppercase tracking-wider">Next</Text>
                    </Animated.View>

                    <Text className="text-slate-400 font-extrabold text-sm uppercase tracking-widest mb-6 text-center">Question</Text>

                    {/* BULLETPROOF WRAPPER: Explicit flexShrink and flexWrap required for RN Web */}
                    <View className="flex-1 mb-8 w-full overflow-hidden">
                      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} style={{ width: '100%' }}>
                        <Text
                          className="text-white text-2xl font-bold text-center leading-relaxed"
                          style={{ flexShrink: 1, flexWrap: 'wrap', width: '100%' }}
                        >
                          {currentCard?.question}
                        </Text>
                      </ScrollView>
                    </View>

                    <View className="w-full items-center mt-auto">
                      <Text className="text-slate-500 font-bold text-sm bg-slate-900/50 px-6 py-3 rounded-full uppercase tracking-widest">Tap to reveal</Text>
                    </View>
                  </Animated.View>

                  {/* Back Side */}
                  <Animated.View
                    className="absolute top-0 left-0 w-full h-full bg-blue-500 rounded-[40px] border-b-8 border-x-2 border-t-2 border-blue-700 p-8 shadow-2xl overflow-hidden"
                    style={backAnimatedStyle}
                  >
                    <Animated.View style={prevOpacityStyle} className="absolute top-8 right-8 border-4 border-slate-800 rounded-xl px-4 py-2 rotate-[15deg] z-50 bg-blue-600/90">
                      <Text className="text-slate-800 font-extrabold text-xl uppercase tracking-wider">Previous</Text>
                    </Animated.View>
                    <Animated.View style={nextOpacityStyle} className="absolute top-8 left-8 border-4 border-white rounded-xl px-4 py-2 rotate-[-15deg] z-50 bg-blue-600/90">
                      <Text className="text-white font-extrabold text-xl uppercase tracking-wider">Next</Text>
                    </Animated.View>

                    <Text className="text-blue-200 font-extrabold text-sm uppercase tracking-widest mb-6 text-center">Answer</Text>

                    {/* BULLETPROOF WRAPPER: Explicit flexShrink and flexWrap required for RN Web */}
                    <View className="flex-1 mb-8 w-full overflow-hidden">
                      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} style={{ width: '100%' }}>
                        <Text
                          className="text-white text-2xl font-bold text-center leading-relaxed"
                          style={{ flexShrink: 1, flexWrap: 'wrap', width: '100%' }}
                        >
                          {currentCard?.answer}
                        </Text>
                      </ScrollView>
                    </View>

                    <View className="w-full items-center mt-auto">
                      <Text className="text-blue-200 font-bold text-sm bg-blue-700/50 px-6 py-3 rounded-full uppercase tracking-widest">Tap to flip back</Text>
                    </View>
                  </Animated.View>

                </View>
              </TouchableOpacity>
            </Animated.View>
          </GestureDetector>
        </View>

        {/* Bottom Buttons */}
        <View className="flex-row justify-between pt-10 px-4">
          <TouchableOpacity
            onPress={() => {
              if (currentIndex === 0) return;
              translateX.value = withTiming(-SCREEN_WIDTH * 1.5, { duration: 300 });
              setTimeout(() => handleNextCard('prev'), 300);
            }}
            className={`flex-row items-center justify-center bg-slate-800 py-4 px-6 rounded-full border-b-8 border-x-2 border-t-2 ${currentIndex === 0 ? 'opacity-50 border-slate-700' : 'border-blue-700 active:border-b-2 active:mt-1'}`}
            disabled={currentIndex === 0}
          >
            <Ionicons name="chevron-back" size={24} color={currentIndex === 0 ? "#475569" : "#3b82f6"} />
            <Text className={`font-black ml-2 text-lg ${currentIndex === 0 ? 'text-slate-500' : 'text-blue-500'}`}>Previous</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              if (currentIndex === flashcards.length - 1) return;
              translateX.value = withTiming(SCREEN_WIDTH * 1.5, { duration: 300 });
              setTimeout(() => handleNextCard('next'), 300);
            }}
            className={`flex-row items-center justify-center bg-slate-800 py-4 px-8 rounded-full border-b-8 border-x-2 border-t-2 ${currentIndex === flashcards.length - 1 ? 'opacity-50 border-slate-700' : 'border-emerald-700 active:border-b-2 active:mt-1'}`}
            disabled={currentIndex === flashcards.length - 1}
          >
            <Text className={`font-black mr-2 text-lg ${currentIndex === flashcards.length - 1 ? 'text-slate-500' : 'text-emerald-500'}`}>Next</Text>
            <Ionicons name="chevron-forward" size={24} color={currentIndex === flashcards.length - 1 ? "#475569" : "#10b981"} />
          </TouchableOpacity>
        </View>

      </View>
    </GestureHandlerRootView>
  );
}