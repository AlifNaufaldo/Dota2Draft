import { useState, useCallback } from "react";

interface LoadingState {
  isLoadingHeroes: boolean;
  isLoadingSuggestions: boolean;
  isLoadingStats: boolean;
  loadingMessage: string;
  setHeroesLoading: (loading: boolean) => void;
  setSuggestionsLoading: (loading: boolean, message?: string) => void;
  setStatsLoading: (loading: boolean) => void;
  setLoadingMessage: (message: string) => void;
}

export const useLoadingStates = (): LoadingState => {
  const [isLoadingHeroes, setIsLoadingHeroes] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [loadingMessage, setLoadingMessageState] = useState("");

  const setHeroesLoading = useCallback((loading: boolean) => {
    setIsLoadingHeroes(loading);
  }, []);

  const setSuggestionsLoading = useCallback(
    (loading: boolean, message?: string) => {
      setIsLoadingSuggestions(loading);
      setLoadingMessageState(message || (loading ? "Analyzing draft..." : ""));
    },
    []
  );

  const setStatsLoading = useCallback((loading: boolean) => {
    setIsLoadingStats(loading);
  }, []);

  const setLoadingMessage = useCallback((message: string) => {
    setLoadingMessageState(message);
  }, []);

  return {
    isLoadingHeroes,
    isLoadingSuggestions,
    isLoadingStats,
    loadingMessage,
    setHeroesLoading,
    setSuggestionsLoading,
    setStatsLoading,
    setLoadingMessage,
  };
};
