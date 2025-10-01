"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Hero } from "@/lib/types";
import { getHeroImageUrl, getHeroImageById } from "@/lib/opendota";
import { X } from "lucide-react";

interface TeamDraftProps {
  team: (Hero | null)[];
  teamName: string;
  teamColor: "blue" | "red";
  onRemoveHero?: (position: number) => void;
  canEdit?: boolean;
}

export function TeamDraft({
  team,
  teamName,
  teamColor,
  onRemoveHero,
  canEdit = false,
}: TeamDraftProps) {
  const bgColor =
    teamColor === "blue"
      ? "bg-gradient-to-br from-blue-950/30 to-blue-900/20 border-blue-500/40 shadow-blue-500/10"
      : "bg-gradient-to-br from-red-950/30 to-red-900/20 border-red-500/40 shadow-red-500/10";
  const textColor = teamColor === "blue" ? "text-blue-300" : "text-red-300";

  return (
    <Card className={`${bgColor} border-2`}>
      <CardHeader className="pb-3">
        <CardTitle className={`text-center ${textColor} text-xl font-bold`}>
          {teamName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {team.map((hero, index) => (
          <div key={index} className="relative">
            <HeroSlot
              hero={hero}
              position={index + 1}
              onRemove={
                canEdit && onRemoveHero ? () => onRemoveHero(index) : undefined
              }
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

interface HeroSlotProps {
  hero: Hero | null;
  position: number;
  onRemove?: () => void;
}

function HeroSlot({ hero, position, onRemove }: HeroSlotProps) {
  if (!hero) {
    return (
      <div className="flex items-center justify-center h-16 bg-gradient-to-r from-slate-800/40 to-slate-700/40 border-2 border-dashed border-slate-600/60 rounded-lg hover:border-slate-500/80 transition-colors">
        <span className="text-slate-400 text-sm font-medium">
          Position {position}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-slate-800/60 to-slate-700/40 rounded-lg border border-slate-600/50 hover:border-slate-500/80 hover:bg-gradient-to-r hover:from-slate-700/70 hover:to-slate-600/50 transition-all duration-200 group shadow-lg">
      <Avatar className="h-12 w-12 ring-2 ring-slate-600/50">
        <AvatarImage
          src={getHeroImageById(hero.id, "icon")}
          alt={hero.localized_name}
          className="object-cover"
          onError={(e) => {
            // Fallback to name-based URL if ID-based fails
            const target = e.target as HTMLImageElement;
            target.src = getHeroImageUrl(hero.name, "icon");
          }}
        />
        <AvatarFallback className="bg-gradient-to-br from-slate-700 to-slate-800 text-slate-200 text-xs font-medium">
          {hero.localized_name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-white truncate">
          {hero.localized_name}
        </h4>
        <div className="flex flex-wrap gap-1 mt-1">
          {hero.roles.slice(0, 2).map((role) => (
            <Badge
              key={role}
              variant="secondary"
              className="text-xs px-1.5 py-0.5 bg-gray-700/80 text-gray-300"
            >
              {role}
            </Badge>
          ))}
        </div>
      </div>

      <div className="text-right">
        <Badge
          variant="outline"
          className={`text-xs ${
            hero.primary_attr === "str"
              ? "border-red-500 text-red-400"
              : hero.primary_attr === "agi"
              ? "border-green-500 text-green-400"
              : "border-blue-500 text-blue-400"
          }`}
        >
          {hero.primary_attr.toUpperCase()}
        </Badge>
      </div>

      {onRemove && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto w-auto hover:bg-red-500/20"
        >
          <X className="h-4 w-4 text-red-400" />
        </Button>
      )}
    </div>
  );
}
