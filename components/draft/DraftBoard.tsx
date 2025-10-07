"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TeamDraft } from "./TeamDraft";
import { SuggestionPanel } from "./SuggestionPanel";
import { HeroGrid } from "./HeroGrid";
import { GameContextPanel } from "./GameContextPanel";
import { LoadingToast } from "@/components/ui/LoadingToast";
import { useDraft } from "@/hooks/useDraft";
import { Hero } from "@/lib/types";
import { RotateCcw, Zap, Users, Sword, Brain } from "lucide-react";
import { useToast } from "@/components/ui/toast";

type PickingMode = "your-team" | "enemy-team" | "suggestions";

export function DraftBoard() {
  const {
    draftState,
    heroes,
    suggestions,
    heroesLoading,
    suggestionsLoading,
    suggestionsError,
    loadingNotification,
    gameContext,
    useAdvancedAnalysis,
    addHeroToTeam,
    removeHeroFromTeam,
    resetDraft,
    getSuggestions,
    roleFilter,
    setRoleFilter,
    setGameContext,
    setUseAdvancedAnalysis,
    isHeroPicked,
    getDraftProgress,
  } = useDraft();

  const { addToast } = useToast();
  const [pickingMode, setPickingMode] = useState<PickingMode>("enemy-team");

  const progress = getDraftProgress();

  const handleHeroSelect = (hero: Hero) => {
    if (pickingMode === "your-team") {
      // Find next available position in your team
      const nextPosition = draftState.yourTeam.findIndex((h) => h === null);
      if (nextPosition !== -1) {
        addHeroToTeam(hero, "your", nextPosition);
        addToast({
          type: "success",
          title: "Hero Added to Your Team!",
          description: `${hero.localized_name} joined your lineup`,
          duration: 3000,
        });
      } else {
        addToast({
          type: "warning",
          title: "Team Full",
          description: "Your team is already complete (5/5 heroes)",
          duration: 3000,
        });
      }
    } else if (pickingMode === "enemy-team") {
      // Find next available position in enemy team
      const nextPosition = draftState.enemyTeam.findIndex((h) => h === null);
      if (nextPosition !== -1) {
        addHeroToTeam(hero, "enemy", nextPosition);
        addToast({
          type: "info",
          title: "Enemy Hero Added",
          description: `${hero.localized_name} added to enemy team`,
          duration: 3000,
        });

        // Auto-refresh suggestions when enemy picks
        setTimeout(() => {
          getSuggestions();
        }, 100);
      } else {
        addToast({
          type: "warning",
          title: "Enemy Team Full",
          description: "Enemy team is already complete (5/5 heroes)",
          duration: 3000,
        });
      }
    }
  };

  const handleSuggestionSelect = (heroId: number) => {
    const hero = heroes.find((h) => h.id === heroId);
    if (hero) {
      const nextPosition = draftState.yourTeam.findIndex((h) => h === null);
      if (nextPosition !== -1) {
        addHeroToTeam(hero, "your", nextPosition);
      }
    }
  };

  const handleRemoveHero = (team: "your" | "enemy", position: number) => {
    const hero =
      team === "your"
        ? draftState.yourTeam[position]
        : draftState.enemyTeam[position];
    removeHeroFromTeam(team, position);

    if (hero) {
      addToast({
        type: "info",
        title: "Hero Removed",
        description: `${hero.localized_name} removed from ${
          team === "your" ? "your" : "enemy"
        } team`,
        duration: 2500,
      });
    }

    // Refresh suggestions if enemy team changed
    if (team === "enemy") {
      setTimeout(() => {
        getSuggestions();
      }, 100);
    }
  };

  if (heroesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center space-y-6 p-8">
          <div className="relative">
            <div className="animate-spinner rounded-full h-16 w-16 border-4 border-cyan-400/30 border-t-cyan-400 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Zap className="h-8 w-8 text-cyan-400 animate-pulse" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">
              Loading Dota 2 Draft Analyzer
            </h2>
            <p className="text-slate-300">
              Fetching hero data and statistics...
            </p>
            <div className="flex items-center justify-center gap-1 mt-4">
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
              <div
                className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"
                style={{ animationDelay: "0.1s" }}
              ></div>
              <div
                className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <LoadingToast
        isVisible={loadingNotification.isVisible}
        message={loadingNotification.message}
        type={loadingNotification.type}
      />
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <Card className="bg-gradient-to-r from-slate-800/60 to-slate-700/40 border-slate-600/60 shadow-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
                  <Zap className="h-8 w-8 text-blue-500" />
                  Dota 2 Draft Analyzer
                  <Badge
                    variant="secondary"
                    className={`ml-2 transition-all duration-200 ${
                      suggestionsLoading
                        ? "animate-pulse bg-emerald-600/20 border-emerald-500/50 text-emerald-300"
                        : ""
                    }`}
                  >
                    {suggestionsLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border border-emerald-400/30 border-t-emerald-400 mr-2"></div>
                        Analyzing...
                      </>
                    ) : (
                      `${progress.totalPicks}/10 Heroes Picked`
                    )}
                  </Badge>
                </CardTitle>

                <div className="flex gap-2">
                  <Button
                    onClick={getSuggestions}
                    disabled={
                      suggestionsLoading || progress.enemyTeamPicks === 0
                    }
                    variant="default"
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-all duration-200"
                  >
                    {suggestionsLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white mr-2"></div>
                        Analyzing Draft...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Get AI Suggestions
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={() => {
                      resetDraft();
                      addToast({
                        type: "info",
                        title: "Draft Reset",
                        description:
                          "All heroes have been cleared from both teams",
                        duration: 2500,
                      });
                    }}
                    variant="outline"
                    className="border-red-500/30 text-red-400 hover:bg-red-500/20"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset Draft
                  </Button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-700/80 rounded-full h-3 mt-4 overflow-hidden shadow-inner">
                <div
                  className="bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500 shadow-lg"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
            </CardHeader>
          </Card>

          {/* Draft Teams */}
          <div className="grid lg:grid-cols-2 gap-6">
            <TeamDraft
              team={draftState.yourTeam}
              teamName="Your Team"
              teamColor="blue"
              onRemoveHero={(position) => handleRemoveHero("your", position)}
              canEdit={true}
            />

            <TeamDraft
              team={draftState.enemyTeam}
              teamName="Enemy Team"
              teamColor="red"
              onRemoveHero={(position) => handleRemoveHero("enemy", position)}
              canEdit={true}
            />
          </div>

          {/* Mode Selection */}
          <Card className="bg-gradient-to-r from-slate-800/40 to-slate-700/30 border-slate-600/50 shadow-lg">
            <CardContent className="p-4">
              <div className="flex gap-2 justify-center">
                <Button
                  variant={pickingMode === "enemy-team" ? "default" : "outline"}
                  onClick={() => setPickingMode("enemy-team")}
                  className="flex items-center gap-2"
                >
                  <Sword className="h-4 w-4" />
                  Pick Enemy Heroes
                </Button>

                <Button
                  variant={pickingMode === "your-team" ? "default" : "outline"}
                  onClick={() => setPickingMode("your-team")}
                  className="flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  Pick Your Heroes
                </Button>

                <Button
                  variant={
                    pickingMode === "suggestions" ? "default" : "outline"
                  }
                  onClick={() => setPickingMode("suggestions")}
                  className="flex items-center gap-2"
                  disabled={progress.enemyTeamPicks === 0}
                >
                  <Zap className="h-4 w-4" />
                  View Suggestions
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Main Content */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Hero Selection or Suggestions */}
            <div className="lg:col-span-2">
              {pickingMode === "suggestions" ? (
                <SuggestionPanel
                  suggestions={suggestions}
                  isLoading={suggestionsLoading}
                  error={suggestionsError}
                  onRefresh={getSuggestions}
                  onSelectHero={handleSuggestionSelect}
                  roleFilter={roleFilter}
                  onRoleFilterChange={setRoleFilter}
                />
              ) : (
                <HeroGrid
                  heroes={heroes}
                  onSelectHero={handleHeroSelect}
                  isHeroPicked={isHeroPicked}
                  isLoading={heroesLoading}
                />
              )}
            </div>

            {/* Side Panel - Always show suggestions if available */}
            <div className="space-y-4">
              {/* Game Context Panel */}
              <GameContextPanel
                gameContext={gameContext}
                setGameContext={setGameContext}
                useAdvancedAnalysis={useAdvancedAnalysis}
                setUseAdvancedAnalysis={setUseAdvancedAnalysis}
                onAnalyze={getSuggestions}
                isAnalyzing={suggestionsLoading}
              />
              {suggestions.length > 0 && pickingMode !== "suggestions" && (
                <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/80 border-slate-700/60 shadow-xl backdrop-blur-sm">
                  <CardHeader className="pb-3 border-b border-slate-700/50">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Zap className="h-5 w-5 text-emerald-400 animate-pulse" />
                      <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent font-bold">
                        Quick Picks
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {suggestions.slice(0, 3).map((suggestion, index) => (
                      <div
                        key={suggestion.hero.id}
                        className="group flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-slate-800/60 to-slate-700/40 hover:from-emerald-900/30 hover:to-cyan-900/20 cursor-pointer transition-all duration-300 border border-slate-600/40 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10"
                        onClick={() =>
                          handleSuggestionSelect(suggestion.hero.id)
                        }
                      >
                        <Badge
                          className={`${
                            index === 0
                              ? "bg-gradient-to-br from-amber-400 to-orange-500 text-black"
                              : index === 1
                              ? "bg-gradient-to-br from-emerald-500 to-cyan-500"
                              : "bg-gradient-to-br from-slate-500 to-slate-600"
                          } text-white min-w-[24px] justify-center font-bold shadow-lg`}
                        >
                          {index + 1}
                        </Badge>
                        <span className="text-sm text-white truncate font-medium group-hover:text-emerald-200 transition-colors">
                          {suggestion.hero.localized_name}
                        </span>
                        <Badge className="bg-slate-700/60 border-slate-600/60 text-slate-300 text-xs ml-auto px-2">
                          {suggestion.win_rate.toFixed(2)}%
                        </Badge>
                      </div>
                    ))}

                    <Button
                      onClick={() => setPickingMode("suggestions")}
                      className="w-full mt-3 bg-gradient-to-r from-emerald-600/20 to-cyan-600/20 border-emerald-500/50 text-emerald-300 hover:from-emerald-600/30 hover:to-cyan-600/30 hover:border-emerald-400 transition-all duration-200"
                      size="sm"
                    >
                      <Brain className="h-4 w-4 mr-2" />
                      View All AI Suggestions
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Draft Stats */}
              <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/80 border-slate-700/60 shadow-xl backdrop-blur-sm">
                <CardHeader className="pb-3 border-b border-slate-700/50">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-cyan-400" />
                    <span className="text-slate-200 font-bold">
                      Draft Progress
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300 font-medium flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
                        Your Team:
                      </span>
                      <Badge className="bg-cyan-600/20 border-cyan-500/50 text-cyan-300 font-bold">
                        {progress.yourTeamPicks}/5
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300 font-medium flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                        Enemy Team:
                      </span>
                      <Badge className="bg-rose-600/20 border-rose-500/50 text-rose-300 font-bold">
                        {progress.enemyTeamPicks}/5
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-700/50">
                      <span className="text-slate-300 font-medium">
                        Total Progress:
                      </span>
                      <Badge className="bg-emerald-600/20 border-emerald-500/50 text-emerald-300 font-bold">
                        {progress.progress.toFixed(0)}%
                      </Badge>
                    </div>
                  </div>

                  {progress.enemyTeamPicks === 0 && (
                    <div className="text-center p-4 bg-gradient-to-br from-amber-950/40 to-yellow-950/30 border border-amber-500/50 rounded-xl shadow-lg">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Brain className="h-4 w-4 text-amber-400" />
                        <p className="text-amber-300 text-sm font-semibold">
                          Ready for Analysis
                        </p>
                      </div>
                      <p className="text-amber-200/80 text-xs">
                        Pick enemy heroes to unlock AI suggestions
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
