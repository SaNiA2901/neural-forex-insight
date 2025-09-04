
import { useState } from "react";
import { ModernLayout } from "@/components/layout/ModernLayout";
import { ModernDashboard } from "@/components/modern/ModernDashboard";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { PreviewOptimizedDashboard } from '@/components/ui/enhanced/PreviewOptimizedDashboard';
import { isPreviewEnvironment } from '@/utils/previewOptimization';

const Index = () => {
  const [selectedPair, setSelectedPair] = useState("EUR/USD");
  const [timeframe, setTimeframe] = useState("1h");

  // Безопасная проверка preview окружения с обработкой ошибок
  let isPreview = false;
  try {
    isPreview = isPreviewEnvironment();
  } catch (error) {
    console.error("Ошибка проверки preview окружения:", error);
    isPreview = false;
  }

  // Безопасный возврат оптимизированного dashboard для preview
  if (isPreview) {
    try {
      return (
        <ErrorBoundary>
          <PreviewOptimizedDashboard />
        </ErrorBoundary>
      );
    } catch (error) {
      console.error("Ошибка загрузки PreviewOptimizedDashboard:", error);
      // Если есть ошибка с preview компонентом, продолжаем с основным интерфейсом
    }
  }

  return (
    <ModernLayout
      selectedPair={selectedPair}
      onPairChange={setSelectedPair}
      timeframe={timeframe}
      onTimeframeChange={setTimeframe}
    >
      <ErrorBoundary>
        <ModernDashboard 
          selectedPair={selectedPair} 
          timeframe={timeframe} 
        />
      </ErrorBoundary>
    </ModernLayout>
  );
};

export default Index;
