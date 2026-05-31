-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Decks Table
CREATE TABLE decks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Flashcards Table
CREATE TABLE flashcards (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    deck_id UUID REFERENCES decks(id) ON DELETE CASCADE NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

-- Policies for decks
CREATE POLICY "Users can view their own decks" 
ON decks FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own decks" 
ON decks FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own decks" 
ON decks FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own decks" 
ON decks FOR DELETE 
USING (auth.uid() = user_id);

-- Policies for flashcards
-- Users can access flashcards if they own the deck they belong to
CREATE POLICY "Users can view flashcards of their decks" 
ON flashcards FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM decks 
        WHERE decks.id = flashcards.deck_id AND decks.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert flashcards into their decks" 
ON flashcards FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM decks 
        WHERE decks.id = flashcards.deck_id AND decks.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update flashcards of their decks" 
ON flashcards FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM decks 
        WHERE decks.id = flashcards.deck_id AND decks.user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete flashcards of their decks" 
ON flashcards FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM decks 
        WHERE decks.id = flashcards.deck_id AND decks.user_id = auth.uid()
    )
);
