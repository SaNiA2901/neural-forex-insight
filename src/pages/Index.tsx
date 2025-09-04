
import { useState } from "react";
import { ModernLayout } from "@/components/layout/ModernLayout";
import { OnlineMode } from "@/components/modes/OnlineMode";
import { ManualMode } from "@/components/modes/ManualMode";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, LineChart } from "lucide-react";

export default function Index() {
  const [activeMode, setActiveMode] = useState("online");
  const [selectedPair, setSelectedPair] = useState("EUR/USD");
  const [timeframe, setTimeframe] = useState("1h");

  return (
    <ModernLayout
      selectedPair={selectedPair}
      onPairChange={setSelectedPair}
      timeframe={timeframe}
      onTimeframeChange={setTimeframe}
    >
      <div className="space-y-6">
        <Tabs value={activeMode} onValueChange={setActiveMode} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-muted/30 p-1">
            <TabsTrigger 
              value="online" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Онлайн режим
            </TabsTrigger>
            <TabsTrigger 
              value="manual" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <LineChart className="h-4 w-4 mr-2" />
              Ручной режим
            </TabsTrigger>
          </TabsList>

          <TabsContent value="online" className="mt-6">
            <OnlineMode />
          </TabsContent>

          <TabsContent value="manual" className="mt-6">
            <ManualMode />
          </TabsContent>
        </Tabs>
      </div>
    </ModernLayout>
  );
}
