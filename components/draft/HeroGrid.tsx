"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Hero, Role } from "@/lib/types";
import { getHeroImageUrl } from "@/lib/opendota";
import { Search, Filter } from "lucide-react";

interface HeroGridProps {
  heroes: Hero[];
  onSelectHero: (hero: Hero) => void;
  isHeroPicked: (heroId: number) => boolean;
  isLoading?: boolean;
  className?: string;
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

export function HeroGrid({
  heroes,
  onSelectHero,
  isHeroPicked,
  isLoading = false,
  className,
}: HeroGridProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<Role[]>([]);
  const [selectedAttribute, setSelectedAttribute] = useState<string>("all");

  const filteredHeroes = useMemo(() => {
    return heroes.filter((hero) => {
      // Search filter
      const matchesSearch = hero.localized_name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      // Role filter
      const matchesRole =
        selectedRoles.length === 0 ||
        selectedRoles.some((role) => hero.roles.includes(role));

      // Attribute filter
      const matchesAttribute =
        selectedAttribute === "all" || hero.primary_attr === selectedAttribute;

      return matchesSearch && matchesRole && matchesAttribute;
    });
  }, [heroes, searchTerm, selectedRoles, selectedAttribute]);

  const toggleRole = (role: Role) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedRoles([]);
    setSelectedAttribute("all");
  };

  return (
    <Card className={`bg-gray-900/90 border-gray-700 ${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-white">
          {isLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-cyan-400/30 border-t-cyan-400"></div>
          ) : (
            <Filter className="h-5 w-5 text-blue-400" />
          )}
          {isLoading ? "Loading Heroes..." : `Hero Selection (${filteredHeroes.length})`}
        </CardTitle>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={isLoading ? "Loading heroes..." : "Search heroes..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={isLoading}
            className="pl-10 bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Filters */}
        <div className="space-y-3">
          {/* Attribute Filter */}
          <div className="flex gap-2">
            <Button
              variant={selectedAttribute === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedAttribute("all")}
            >
              All
            </Button>
            <Button
              variant={selectedAttribute === "str" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedAttribute("str")}
              className={
                selectedAttribute === "str"
                  ? "bg-red-600 hover:bg-red-700 text-white border-red-500"
                  : "text-red-300 border-red-500/40 hover:bg-red-500/20 hover:text-red-200"
              }
            >
              STR
            </Button>
            <Button
              variant={selectedAttribute === "agi" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedAttribute("agi")}
              className={
                selectedAttribute === "agi"
                  ? "bg-green-600 hover:bg-green-700 text-white border-green-500"
                  : "text-green-300 border-green-500/40 hover:bg-green-500/20 hover:text-green-200"
              }
            >
              AGI
            </Button>
            <Button
              variant={selectedAttribute === "int" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedAttribute("int")}
              className={
                selectedAttribute === "int"
                  ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-500"
                  : "text-blue-300 border-blue-500/40 hover:bg-blue-500/20 hover:text-blue-200"
              }
            >
              INT
            </Button>
          </div>

          {/* Role Filter */}
          <div className="flex flex-wrap gap-1">
            {AVAILABLE_ROLES.map((role) => (
              <Badge
                key={role}
                variant={selectedRoles.includes(role) ? "default" : "outline"}
                className={`cursor-pointer text-xs transition-colors ${
                  selectedRoles.includes(role)
                    ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-500"
                    : "bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700 hover:text-white"
                }`}
                onClick={() => toggleRole(role)}
              >
                {role}
              </Badge>
            ))}
          </div>

          {/* Clear Filters */}
          {(searchTerm ||
            selectedRoles.length > 0 ||
            selectedAttribute !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-gray-400 hover:text-white hover:bg-gray-800"
            >
              Clear Filters ({filteredHeroes.length} heroes)
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="bg-gray-900/50">
        {isLoading ? (
          <div className="space-y-4">
            {/* Loading indicator */}
            <div className="text-center py-6">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-400/30 border-t-cyan-400 mx-auto mb-4"></div>
              <p className="text-slate-300 font-medium">Loading Heroes...</p>
              <p className="text-slate-400 text-sm">Fetching Dota 2 hero data</p>
            </div>
            {/* Loading skeleton */}
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2 max-h-96 overflow-y-auto">
              {Array.from({ length: 48 }).map((_, i) => (
                <div key={i} className="bg-slate-800/60 rounded-lg p-2 animate-pulse border border-slate-700/50">
                  <div className="aspect-square bg-slate-700/60 rounded mb-1"></div>
                  <div className="h-2 bg-slate-700/60 rounded mb-1"></div>
                  <div className="h-2 bg-slate-700/40 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
              {filteredHeroes.map((hero) => (
                <HeroCard
                  key={hero.id}
                  hero={hero}
                  onSelect={() => onSelectHero(hero)}
                  isPicked={isHeroPicked(hero.id)}
                />
              ))}
            </div>

            {filteredHeroes.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <p className="text-white">No heroes found matching your filters</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="mt-2 text-gray-400 hover:text-white hover:bg-gray-800"
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface HeroCardProps {
  hero: Hero;
  onSelect: () => void;
  isPicked: boolean;
}

function HeroCard({ hero, onSelect, isPicked }: HeroCardProps) {
  const attributeColors = {
    str: {
      border: "border-red-500/70",
      bg: "from-red-950/40 to-red-900/30",
      hover: "hover:border-red-400 hover:shadow-red-500/20",
      icon: "text-red-400"
    },
    agi: {
      border: "border-green-500/70",
      bg: "from-green-950/40 to-green-900/30",
      hover: "hover:border-green-400 hover:shadow-green-500/20",
      icon: "text-green-400"
    },
    int: {
      border: "border-blue-500/70",
      bg: "from-blue-950/40 to-blue-900/30",
      hover: "hover:border-blue-400 hover:shadow-blue-500/20",
      icon: "text-blue-400"
    },
    // Fallback for unknown attributes
    default: {
      border: "border-slate-500/70",
      bg: "from-slate-950/40 to-slate-900/30",
      hover: "hover:border-slate-400 hover:shadow-slate-500/20",
      icon: "text-slate-400"
    }
  };

  // Safely get colors with fallback
  const colors = attributeColors[(hero.primary_attr || 'str') as keyof typeof attributeColors] || attributeColors.default;
  const mainRole = hero.roles?.[0] || "Unknown";
  const attackType = hero.attack_type || "Unknown";

  return (
    <div
      className={`
        group relative cursor-pointer transition-all duration-200 
        ${
          isPicked
            ? "opacity-50 cursor-not-allowed grayscale"
            : `hover:scale-[1.02] hover:shadow-lg`
        }
      `}
      onClick={!isPicked ? onSelect : undefined}
      title={`${hero.localized_name || 'Unknown Hero'} - ${mainRole} (${attackType})`}
    >
      <Card className={`
        border overflow-hidden bg-gradient-to-br from-slate-900/60 to-slate-800/40
        ${
          isPicked 
            ? "border-slate-600/40" 
            : `${colors.border} ${colors.bg} ${colors.hover} hover:shadow-md`
        }
      `}>
        <CardContent className="p-1.5">
          {/* Hero Portrait */}
          <div className="relative aspect-square mb-1.5">
            <Avatar className="w-full h-full rounded-md">
              <AvatarImage
                src={getHeroImageUrl(hero.name, "icon")}
                alt={hero.localized_name || 'Unknown Hero'}
                className="object-cover transition-transform group-hover:scale-110"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  const heroName = (hero.name || '').replace("npc_dota_hero_", "") || 'unknown';
                  target.src = `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/heroes/${heroName}_icon.png`;
                }}
              />
              <AvatarFallback className="bg-gradient-to-br from-slate-700 to-slate-800 text-slate-200 text-[10px] font-bold">
                {(hero.localized_name || 'UH').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            {/* Attribute indicator */}
            <div className={`absolute top-0.5 right-0.5 w-2 h-2 rounded-full ${colors.icon.replace('text-', 'bg-')} shadow-sm`}></div>
            
            {/* Attack type indicator */}
            <div className="absolute bottom-0.5 left-0.5">
              <div className={`w-1.5 h-1.5 ${attackType === 'Melee' ? 'bg-orange-400' : 'bg-cyan-400'} rounded-sm shadow-sm`}></div>
            </div>

            {/* Picked overlay */}
            {isPicked && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-md">
                <div className="text-[8px] font-bold text-red-400 bg-black/80 px-1 py-0.5 rounded">
                  PICKED
                </div>
              </div>
            )}
          </div>

          {/* Hero Info */}
          <div className="space-y-0.5">
            {/* Name */}
            <h4 className="text-[10px] font-semibold text-white truncate leading-tight">
              {hero.localized_name || 'Unknown Hero'}
            </h4>
            
            {/* Main role and attribute */}
            <div className="flex items-center justify-between">
              <span className={`text-[8px] font-medium ${colors.icon} truncate flex-1`}>
                {mainRole.slice(0, 6)}
              </span>
              <span className="text-[8px] font-bold text-slate-300">
                {(hero.primary_attr || 'str').toUpperCase()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
