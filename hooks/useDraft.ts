import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Hero,
  DraftState,
  DraftSuggestion,
  HeroStats,
  Role,
} from "@/lib/types";

// API functions
const fetchHeroes = async (): Promise<Hero[]> => {
  const response = await fetch("/api/heroes");
  if (!response.ok) throw new Error("Failed to fetch heroes");
  return response.json();
};

const fetchHeroStats = async (): Promise<HeroStats[]> => {
  const response = await fetch("/api/hero-stats");
  if (!response.ok) throw new Error("Failed to fetch hero stats");
  return response.json();
};

const fetchSuggestions = async (
  draftState: DraftState,
  roleFilter?: Role[],
  gameContext?: {
    expectedDuration?: number;
    preferredLanes?: number[];
    playstyle?: "aggressive" | "defensive" | "balanced";
    itemStrategy?: "early" | "scaling" | "utility";
  },
  useAdvanced: boolean = true
): Promise<DraftSuggestion[]> => {
  const response = await fetch("/api/suggestions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      draftState,
      roleFilter,
      gameContext,
      useAdvanced,
    }),
  });
  if (!response.ok) throw new Error("Failed to fetch suggestions");
  return response.json();
};

export const useDraft = () => {
  const queryClient = useQueryClient();

  // Draft state management
  const [draftState, setDraftState] = useState<DraftState>({
    yourTeam: [null, null, null, null, null],
    enemyTeam: [null, null, null, null, null],
    currentPhase: "pick",
    currentPick: 0,
  });

  const [roleFilter, setRoleFilter] = useState<Role[]>([]);

  // Game context for advanced analysis
  const [gameContext, setGameContext] = useState<{
    expectedDuration?: number;
    preferredLanes?: number[];
    playstyle?: "aggressive" | "defensive" | "balanced";
    itemStrategy?: "early" | "scaling" | "utility";
  }>({});

  const [useAdvancedAnalysis, setUseAdvancedAnalysis] = useState(true);

  // Loading notification state
  const [loadingNotification, setLoadingNotification] = useState<{
    isVisible: boolean;
    message: string;
    type: "loading" | "success" | "error";
  }>({ isVisible: false, message: "", type: "loading" });

  // Queries
  const {
    data: heroes = [],
    isLoading: heroesLoading,
    error: heroesError,
  } = useQuery({
    queryKey: ["heroes"],
    queryFn: fetchHeroes,
    staleTime: 1000 * 60 * 60, // 1 hour - heroes don't change often
  });

  const {
    data: heroStats = [],
    isLoading: statsLoading,
    error: statsError,
  } = useQuery({
    queryKey: ["heroStats"],
    queryFn: fetchHeroStats,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  // Suggestions mutation (triggered manually)
  const suggestionsMutation = useMutation({
    mutationFn: ({
      draftState,
      roleFilter,
      gameContext,
      useAdvanced,
    }: {
      draftState: DraftState;
      roleFilter?: Role[];
      gameContext?: {
        expectedDuration?: number;
        preferredLanes?: number[];
        playstyle?: "aggressive" | "defensive" | "balanced";
        itemStrategy?: "early" | "scaling" | "utility";
      };
      useAdvanced?: boolean;
    }) => fetchSuggestions(draftState, roleFilter, gameContext, useAdvanced),
    onMutate: () => {
      // Show loading notification
      setLoadingNotification({
        isVisible: true,
        message: "Analyzing draft composition...",
        type: "loading",
      });
    },
    onSuccess: (data) => {
      // Don't cache suggestions since they depend on dynamic draft state
      // Show success notification
      setLoadingNotification({
        isVisible: true,
        message: `Found ${data.length} AI suggestions!`,
        type: "success",
      });
      // Hide notification after delay
      setTimeout(() => {
        setLoadingNotification((prev) => ({ ...prev, isVisible: false }));
      }, 2000);
    },
    onError: (error) => {
      console.error("Failed to fetch suggestions:", error);
      setLoadingNotification({
        isVisible: true,
        message: "Failed to analyze draft. Please try again.",
        type: "error",
      });
      // Hide error notification after delay
      setTimeout(() => {
        setLoadingNotification((prev) => ({ ...prev, isVisible: false }));
      }, 3000);
    },
  });

  // Draft manipulation functions
  const addHeroToTeam = useCallback(
    (hero: Hero, team: "your" | "enemy", position: number) => {
      setDraftState((prev) => {
        const newState = { ...prev };
        if (team === "your") {
          newState.yourTeam = [...prev.yourTeam];
          newState.yourTeam[position] = hero;
        } else {
          newState.enemyTeam = [...prev.enemyTeam];
          newState.enemyTeam[position] = hero;
        }

        // Auto-advance current pick
        newState.currentPick = Math.min(prev.currentPick + 1, 9);
        if (newState.currentPick >= 10) {
          newState.currentPhase = "completed";
        }

        return newState;
      });

      // Reset mutation data to ensure fresh suggestions
      suggestionsMutation.reset();
    },
    [suggestionsMutation]
  );

  const removeHeroFromTeam = useCallback(
    (team: "your" | "enemy", position: number) => {
      setDraftState((prev) => {
        const newState = { ...prev };
        if (team === "your") {
          newState.yourTeam = [...prev.yourTeam];
          newState.yourTeam[position] = null;
        } else {
          newState.enemyTeam = [...prev.enemyTeam];
          newState.enemyTeam[position] = null;
        }

        // Reset phase if we're removing picks
        newState.currentPhase = "pick";

        return newState;
      });

      // Reset mutation data to ensure fresh suggestions
      suggestionsMutation.reset();
    },
    [suggestionsMutation]
  );

  const resetDraft = useCallback(() => {
    setDraftState({
      yourTeam: [null, null, null, null, null],
      enemyTeam: [null, null, null, null, null],
      currentPhase: "pick",
      currentPick: 0,
    });
    setRoleFilter([]);
    queryClient.removeQueries({ queryKey: ["suggestions"] });
  }, [queryClient]);

  const getSuggestions = useCallback(() => {
    suggestionsMutation.mutate({
      draftState,
      roleFilter,
      gameContext,
      useAdvanced: useAdvancedAnalysis,
    });
  }, [
    suggestionsMutation,
    draftState,
    roleFilter,
    gameContext,
    useAdvancedAnalysis,
  ]);

  // Helper functions
  const getAvailableHeroes = useCallback((): Hero[] => {
    const pickedHeroes = new Set([
      ...draftState.yourTeam.filter((h) => h !== null).map((h) => h!.id),
      ...draftState.enemyTeam.filter((h) => h !== null).map((h) => h!.id),
    ]);

    return heroes.filter((hero) => !pickedHeroes.has(hero.id));
  }, [heroes, draftState]);

  const isHeroPicked = useCallback(
    (heroId: number): boolean => {
      const pickedHeroes = [
        ...draftState.yourTeam.filter((h) => h !== null).map((h) => h!.id),
        ...draftState.enemyTeam.filter((h) => h !== null).map((h) => h!.id),
      ];
      return pickedHeroes.includes(heroId);
    },
    [draftState]
  );

  const getHeroById = useCallback(
    (heroId: number): Hero | undefined => {
      return heroes.find((hero) => hero.id === heroId);
    },
    [heroes]
  );

  const getDraftProgress = useCallback(() => {
    const yourTeamPicks = draftState.yourTeam.filter((h) => h !== null).length;
    const enemyTeamPicks = draftState.enemyTeam.filter(
      (h) => h !== null
    ).length;
    const totalPicks = yourTeamPicks + enemyTeamPicks;

    return {
      yourTeamPicks,
      enemyTeamPicks,
      totalPicks,
      progress: (totalPicks / 10) * 100,
    };
  }, [draftState]);

  return {
    // State
    draftState,
    roleFilter,
    loadingNotification,
    gameContext,
    useAdvancedAnalysis,

    // Data
    heroes,
    heroStats,
    suggestions: suggestionsMutation.data || [],

    // Loading states
    heroesLoading,
    statsLoading,
    suggestionsLoading: suggestionsMutation.isPending,

    // Error states
    heroesError,
    statsError,
    suggestionsError: suggestionsMutation.error,

    // Actions
    addHeroToTeam,
    removeHeroFromTeam,
    resetDraft,
    getSuggestions,
    setRoleFilter,
    setGameContext,
    setUseAdvancedAnalysis,

    // Helpers
    getAvailableHeroes,
    isHeroPicked,
    getHeroById,
    getDraftProgress,
  };
};
