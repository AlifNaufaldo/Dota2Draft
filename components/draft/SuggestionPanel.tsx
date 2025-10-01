"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DraftSuggestion, Role } from "@/lib/types";
import { getHeroImageUrl, getHeroImageById } from "@/lib/opendota";
import { Brain, Zap, Star } from "lucide-react";
import Image from "next/image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";

interface SuggestionPanelProps {
  suggestions: DraftSuggestion[];
  isLoading: boolean;
  error?: Error | null;
  onRefresh: () => void;
  onSelectHero: (heroId: number) => void;
  roleFilter: Role[];
  onRoleFilterChange: (roles: Role[]) => void;
}

const AVAILABLE_ROLES: Role[] = [
  "Carry",
  "Support",
  "Initiator",
  "Disabler",
  "Jungler",
  "Durable",
  "Escape",
  "Pusher",
  "Nuker",
];

export function SuggestionPanel({
  suggestions,
  isLoading,
  error,
  onRefresh,
  onSelectHero,
  roleFilter,
  onRoleFilterChange,
}: SuggestionPanelProps) {
  const { addToast } = useToast();

  const handleHeroSelect = (heroId: number, heroName: string) => {
    onSelectHero(heroId);
    addToast({
      type: "success",
      title: "Hero Added!",
      description: `${heroName} has been added to your team`,
      duration: 3000,
    });
  };
  const handleRoleChange = (value: string) => {
    if (value === "all") {
      onRoleFilterChange([]);
    } else {
      const role = value as Role;
      if (roleFilter.includes(role)) {
        onRoleFilterChange(roleFilter.filter((r) => r !== role));
      } else {
        onRoleFilterChange([...roleFilter, role]);
      }
    }
  };

  return (
    <Card className="h-full bg-gradient-to-br from-slate-900/90 to-slate-800/80 border-slate-700/60 shadow-xl backdrop-blur-sm">
      <CardHeader className="pb-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Brain className="h-6 w-6 text-emerald-400 animate-pulse" />
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent font-bold">
              AI Suggestions
            </span>
          </CardTitle>
          <Button
            onClick={onRefresh}
            disabled={isLoading}
            size="sm"
            className="bg-emerald-600/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-600/30 hover:border-emerald-400 transition-all duration-200"
          >
            {isLoading ? (
              <>
                <Brain className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              "Refresh"
            )}
          </Button>
        </div>

        {/* Role Filter */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Select
            value={roleFilter.length === 0 ? "all" : ""}
            onValueChange={handleRoleChange}
          >
            <SelectTrigger className="w-36 bg-slate-800/60 border-slate-600/60 text-slate-200 hover:border-slate-500">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {AVAILABLE_ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {roleFilter.map((role) => (
            <Badge
              key={role}
              className="cursor-pointer bg-cyan-600/20 border-cyan-500/50 text-cyan-300 hover:bg-red-600/30 hover:border-red-500/50 hover:text-red-300 transition-all duration-200"
              onClick={() =>
                onRoleFilterChange(roleFilter.filter((r) => r !== role))
              }
            >
              {role} ×
            </Badge>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
        {error && (
          <div className="text-center p-6 text-red-300 bg-gradient-to-br from-red-950/40 to-red-900/30 rounded-xl border border-red-500/40 shadow-lg">
            <p className="font-medium">Failed to load suggestions</p>
            <Button
              onClick={onRefresh}
              size="sm"
              className="mt-3 bg-red-600/20 border-red-500/50 text-red-300 hover:bg-red-600/30"
            >
              Try Again
            </Button>
          </div>
        )}

        {isLoading && suggestions.length === 0 && (
          <div className="text-center p-10 space-y-4">
            <div className="relative">
              <Brain className="h-16 w-16 mx-auto text-emerald-400 animate-pulse" />
              <div className="absolute inset-0 h-16 w-16 mx-auto border-4 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin"></div>
            </div>
            <p className="text-slate-300 font-medium">Analyzing draft composition...</p>
            <p className="text-slate-400 text-sm">Finding the best hero counters</p>
          </div>
        )}

        {!isLoading && suggestions.length === 0 && !error && (
          <div className="text-center p-10 space-y-4">
            <div className="bg-gradient-to-br from-slate-800/60 to-slate-700/40 rounded-full p-6 mx-auto w-fit">
              <Zap className="h-16 w-16 text-slate-400" />
            </div>
            <div className="space-y-2">
              <p className="text-slate-300 font-medium">
                Ready to analyze your draft
              </p>
              <p className="text-slate-400 text-sm">
                Pick enemy heroes to get AI-powered suggestions
              </p>
            </div>
          </div>
        )}

        {/* Gallery Grid Layout */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {suggestions.map((suggestion, index) => (
            <SuggestionGalleryCard
              key={suggestion.hero.id}
              suggestion={suggestion}
              rank={index + 1}
              onSelect={() => handleHeroSelect(suggestion.hero.id, suggestion.hero.localized_name)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface SuggestionGalleryCardProps {
  suggestion: DraftSuggestion;
  rank: number;
  onSelect: () => void;
}

function SuggestionGalleryCard({ suggestion, rank, onSelect }: SuggestionGalleryCardProps) {
  const { hero, score, win_rate, confidence } = suggestion;

  const confidenceColor = {
    high: "text-emerald-300 border-emerald-500/60",
    medium: "text-amber-300 border-amber-500/60",
    low: "text-rose-300 border-rose-500/60",
  }[confidence];

  const rankBadgeColor =
    rank <= 3
      ? "bg-gradient-to-br from-amber-400 to-orange-500 text-black font-bold shadow-lg"
      : rank <= 6
      ? "bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-md"
      : "bg-gradient-to-br from-slate-500 to-slate-600 text-slate-200";

  return (
    <Card
      className="group relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-emerald-500/20 bg-gradient-to-br from-slate-900/90 to-slate-800/80 border-slate-700/60 hover:border-emerald-500/50 aspect-square"
      onClick={onSelect}
    >
      {/* Rank Badge */}
      <div className="absolute top-2 left-2 z-10">
        <Badge className={`${rankBadgeColor} text-xs px-2 py-1`}>
          #{rank}
        </Badge>
      </div>

      {/* Confidence Badge */}
      <div className="absolute top-2 right-2 z-10">
        <Badge className={`${confidenceColor} bg-slate-900/80 text-xs px-2 py-1 border`}>
          {confidence === 'high' ? '★★★' : confidence === 'medium' ? '★★☆' : '★☆☆'}
        </Badge>
      </div>

      <CardContent className="p-0 h-full">
        {/* Hero Image */}
        <div className="relative h-2/3 overflow-hidden">
          <Image
            src={getHeroImageById(hero.id, "portrait")}
            alt={hero.localized_name}
            width={200}
            height={150}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = getHeroImageUrl(hero.name, "portrait");
            }}
            unoptimized
          />
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
        </div>

        {/* Hero Info */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-slate-900/95 to-transparent">
          <h3 className="font-bold text-white text-sm truncate mb-1">
            {hero.localized_name}
          </h3>
          
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-300 font-semibold">{score}</span>
            </div>
            <span className="text-slate-300">
              {win_rate.toFixed(1)}% WR
            </span>
          </div>

          {/* Primary Role */}
          <div className="mt-1">
            <Badge className="text-xs px-1.5 py-0.5 bg-slate-700/80 text-slate-300 border-slate-600/50">
              {hero.roles[0]}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
