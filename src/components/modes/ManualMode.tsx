import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Play, 
  Clock,
  TrendingUp,
  Target,
  Brain,
  Database,
  Calendar,
  LineChart
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStateManager } from "@/hooks/useStateManager";
import CandleInput from "@/components/ui/CandleInput";

const currencyPairs = [
  "EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "AUD/USD", 
  "USD/CAD", "NZD/USD", "EUR/GBP", "EUR/JPY", "GBP/JPY"
];

const timeframes = [
  { value: "1m", label: "1 минута", minutes: 1 },
  { value: "5m", label: "5 минут", minutes: 5 },
  { value: "15m", label: "15 минут", minutes: 15 },
  { value: "30m", label: "30 минут", minutes: 30 },
  { value: "1h", label: "1 час", minutes: 60 },
  { value: "4h", label: "4 часа", minutes: 240 },
  { value: "1d", label: "1 день", minutes: 1440 }
];

export function ManualMode() {
  const { 
    sessions, 
    currentSession, 
    candles,
    createSession,
    getAppStatistics 
  } = useStateManager();
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [sessionName, setSessionName] = useState("");
  const [selectedPair, setSelectedPair] = useState("EUR/USD");
  const [selectedTimeframe, setSelectedTimeframe] = useState("1h");
  const [startTime, setStartTime] = useState(new Date().toISOString().slice(0, 16));

  const stats = getAppStatistics();

  const handleCreateSession = async () => {
    if (!sessionName.trim()) return;

    try {
      await createSession({
        session_name: sessionName,
        pair: selectedPair,
        timeframe: selectedTimeframe,
        start_date: new Date(startTime).toISOString().split('T')[0],
        start_time: new Date(startTime).toISOString()
      });
      
      setShowCreateForm(false);
      setSessionName("");
    } catch (error) {
      console.error('Ошибка создания сессии:', error);
    }
  };

  const getTimeframeLabel = (tf: string) => {
    return timeframes.find(t => t.value === tf)?.label || tf;
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const currentSessionCandles = currentSession 
    ? candles.filter(c => c.session_id === currentSession.id)
    : [];

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Ручной режим</h1>
          <p className="text-muted-foreground">Создание сессий и ручной ввод данных OHLCV</p>
        </div>
        <Button 
          onClick={() => setShowCreateForm(true)}
          className="trading-button-primary"
        >
          <Plus className="h-4 w-4 mr-2" />
          Новая сессия
        </Button>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="trading-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Database className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Всего сессий</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalSessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="trading-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-trading-success/10 rounded-xl">
                <LineChart className="h-6 w-6 text-trading-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Всего свечей</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalCandles}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="trading-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-trading-warning/10 rounded-xl">
                <Target className="h-6 w-6 text-trading-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Прогнозов</p>
                <p className="text-2xl font-bold text-foreground">{stats.predictionsCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="trading-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-muted/30 rounded-xl">
                <Clock className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Активная сессия</p>
                <p className="text-lg font-bold text-foreground">
                  {currentSession ? currentSession.session_name : "Нет"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Форма создания сессии */}
      {showCreateForm && (
        <Card className="trading-card">
          <CardHeader>
            <CardTitle>Создание новой сессии</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Название сессии</Label>
                <Input
                  placeholder="Введите название сессии"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Валютная пара</Label>
                <Select value={selectedPair} onValueChange={setSelectedPair}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencyPairs.map((pair) => (
                      <SelectItem key={pair} value={pair}>
                        {pair}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Таймфрейм</Label>
                <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeframes.map((tf) => (
                      <SelectItem key={tf.value} value={tf.value}>
                        {tf.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Время первой свечи</Label>
                <Input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={handleCreateSession}
                disabled={!sessionName.trim()}
                className="trading-button-primary"
              >
                <Play className="h-4 w-4 mr-2" />
                Создать сессию
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowCreateForm(false)}
              >
                Отмена
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Список сессий */}
      <Card className="trading-card">
        <CardHeader>
          <CardTitle>Список сессий</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Нет созданных сессий</p>
              <p className="text-sm">Создайте первую сессию для начала работы</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => {
                const sessionCandlesCount = candles.filter(c => c.session_id === session.id).length;
                const isActive = currentSession?.id === session.id;
                
                return (
                  <div 
                    key={session.id} 
                    className={cn(
                      "p-4 rounded-lg border transition-colors",
                      isActive 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-border/80"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <h3 className="font-semibold text-foreground">{session.session_name}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{session.pair}</span>
                            <span>{getTimeframeLabel(session.timeframe)}</span>
                            <span>{formatDateTime(session.start_time)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Badge variant={isActive ? "default" : "secondary"}>
                          {sessionCandlesCount} свечей
                        </Badge>
                        {isActive && (
                          <Badge className="bg-trading-success/10 text-trading-success">
                            Активная
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ввод данных для текущей сессии */}
      {currentSession && (
        <Card className="trading-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Ввод данных свечей - {currentSession.session_name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CandleInput
              currentSession={currentSession}
              candles={currentSessionCandles}
              pair={currentSession.pair}
              onCandleSaved={async () => {}}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}