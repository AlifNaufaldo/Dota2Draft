"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings, Brain, Target, Clock, Sparkles } from "lucide-react";

interface GameContextPanelProps {
  gameContext: {
    expectedDuration?: number;
    preferredLanes?: number[];
    playstyle?: "aggressive" | "defensive" | "balanced";
    itemStrategy?: "early" | "scaling" | "utility";
  };
  setGameContext: (context: GameContextPanelProps["gameContext"]) => void;
  useAdvancedAnalysis: boolean;
  setUseAdvancedAnalysis: (use: boolean) => void;
  onAnalyze: () => void;
  isAnalyzing?: boolean;
}

export function GameContextPanel({
  gameContext,
  setGameContext,
  useAdvancedAnalysis,
  setUseAdvancedAnalysis,
  onAnalyze,
  isAnalyzing = false,
}: GameContextPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateGameContext = (updates: Partial<typeof gameContext>) => {
    setGameContext({ ...gameContext, ...updates });
  };

  const toggleLane = (position: number) => {
    const currentLanes = gameContext.preferredLanes || [];
    const newLanes = currentLanes.includes(position)
      ? currentLanes.filter((p) => p !== position)
      : [...currentLanes, position];
    updateGameContext({ preferredLanes: newLanes });
  };

  const getLaneLabel = (position: number) => {
    const labels = {
      1: "Carry",
      2: "Mid",
      3: "Offlane",
      4: "Support",
      5: "Hard Support",
    };
    return labels[position as keyof typeof labels];
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5" />
            Advanced Analysis
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant={useAdvancedAnalysis ? "default" : "outline"}
              size="sm"
              onClick={() => setUseAdvancedAnalysis(!useAdvancedAnalysis)}
              className="flex items-center gap-1"
            >
              <Brain className="h-4 w-4" />
              {useAdvancedAnalysis ? "ON" : "OFF"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? "Less" : "More"}
            </Button>
          </div>
        </div>
      </CardHeader>

      {(isExpanded || !useAdvancedAnalysis) && (
        <CardContent className="space-y-4">
          {useAdvancedAnalysis && (
            <>
              {/* Game Duration */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="h-4 w-4" />
                  Expected Game Duration
                </label>
                <Select
                  value={gameContext.expectedDuration?.toString() || ""}
                  onValueChange={(value) =>
                    updateGameContext({
                      expectedDuration: value ? parseInt(value) : undefined,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20">Short Game (15-25 min)</SelectItem>
                    <SelectItem value="35">Normal Game (25-45 min)</SelectItem>
                    <SelectItem value="50">Long Game (45+ min)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Playstyle */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Target className="h-4 w-4" />
                  Preferred Playstyle
                </label>
                <Select
                  value={gameContext.playstyle || ""}
                  onValueChange={(
                    value: "aggressive" | "defensive" | "balanced"
                  ) => updateGameContext({ playstyle: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select playstyle..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aggressive">
                      Aggressive (Early Game)
                    </SelectItem>
                    <SelectItem value="balanced">
                      Balanced (Mid Game)
                    </SelectItem>
                    <SelectItem value="defensive">
                      Defensive (Late Game)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Item Strategy */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="h-4 w-4" />
                  Item Strategy
                </label>
                <Select
                  value={gameContext.itemStrategy || ""}
                  onValueChange={(value: "early" | "scaling" | "utility") =>
                    updateGameContext({ itemStrategy: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select strategy..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="early">Early Game Items</SelectItem>
                    <SelectItem value="scaling">Scaling Items</SelectItem>
                    <SelectItem value="utility">Utility Items</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Preferred Lanes */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Preferred Lanes</label>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((position) => (
                    <Button
                      key={position}
                      variant={
                        gameContext.preferredLanes?.includes(position)
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() => toggleLane(position)}
                    >
                      {position}: {getLaneLabel(position)}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Analyze Button */}
          <Button
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className="w-full"
            size="lg"
          >
            {isAnalyzing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Analyzing with {useAdvancedAnalysis ? "Advanced" : "Basic"}{" "}
                Algorithm...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Get {useAdvancedAnalysis ? "Advanced" : "Basic"} AI Suggestions
              </>
            )}
          </Button>

          {useAdvancedAnalysis && (
            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <strong>Advanced Analysis includes:</strong>
              <ul className="mt-1 space-y-1">
                <li>• Item synergy calculations</li>
                <li>• Lane optimization scoring</li>
                <li>• Timing window analysis</li>
                <li>• Professional scene patterns</li>
                <li>• ML-powered team synergy</li>
              </ul>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
