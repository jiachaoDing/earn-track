import React, { useState, useEffect, useRef, useMemo } from "react";
import { Helmet, HelmetProvider } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calculator,
  Settings,
  Play,
  ArrowLeft,
  Clock,
  DollarSign,
  Briefcase,
  Calendar,
  Sun,
  Sparkles,
  Moon,
  HelpCircle,
  X,
} from "lucide-react";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "./components/ui/hover-card";

const currencies = [
  { value: "CNY", label: "人民币 (¥)", symbol: "¥" },
  { value: "USD", label: "美元 ($)", symbol: "$" },
  { value: "EUR", label: "欧元 (€)", symbol: "€" },
  { value: "GBP", label: "英镑 (£)", symbol: "£" },
  { value: "JPY", label: "日元 (¥)", symbol: "¥" },
];

const calculationCycles = [
  { value: "annual", label: "年薪" },
  { value: "monthly", label: "月薪" },
  { value: "daily", label: "日薪" },
  { value: "hourly", label: "时薪" },
];

const workDaysOptions = [
  { value: 7, label: "7 天" },
  { value: 6, label: "6 天" },
  { value: 5.5, label: "5.5 天 (大小周)" },
  { value: 5, label: "5 天" },
  { value: 4, label: "4 天" },
  { value: 3, label: "3 天" },
  { value: 2, label: "2 天" },
  { value: 1, label: "1 天" },
];

const quickSelectOptions = {
  annual: [
    { label: "10万", value: 100000 },
    { label: "20万", value: 200000 },
    { label: "30万", value: 300000 },
    { label: "50万", value: 500000 },
  ],
  monthly: [
    { label: "8千", value: 8000 },
    { label: "1.5万", value: 15000 },
    { label: "2万", value: 20000 },
    { label: "3万", value: 30000 },
  ],
  daily: [
    { label: "200", value: 200 },
    { label: "400", value: 400 },
    { label: "600", value: 600 },
    { label: "800", value: 800 },
  ],
  hourly: [
    { label: "25", value: 25 },
    { label: "50", value: 50 },
    { label: "100", value: 100 },
    { label: "150", value: 150 },
  ],
};

const celebrationMilestones = [
  1, 8, 18, 28, 58, 88, 100, 188, 288, 588, 888, 1000, 1888, 2888, 5888, 8888,
  10000,
];

function App() {
  const [theme, setTheme] = useState(() => {
    // Default to dark mode if no theme is saved
    return localStorage.getItem("earnTrack:theme") || "dark";
  });

  const [settings, setSettings] = useState(() => {
    const defaults = {
      salary: 12000,
      currency: "CNY",
      cycle: "monthly",
      workHours: 8,
      workDaysPerWeek: 5,
    };

    // Priority 1: URL Parameters
    const urlParams = new URLSearchParams(window.location.search);
    const urlSettings = {};
    if (urlParams.has("salary")) {
      const salary = parseFloat(urlParams.get("salary"));
      if (!isNaN(salary)) urlSettings.salary = salary;
    }
    if (urlParams.has("currency")) {
      const currency = urlParams.get("currency");
      if (currencies.some((c) => c.value === currency))
        urlSettings.currency = currency;
    }
    if (urlParams.has("cycle")) {
      const cycle = urlParams.get("cycle");
      if (calculationCycles.some((c) => c.value === cycle))
        urlSettings.cycle = cycle;
    }
    if (urlParams.has("workHours")) {
      const workHours = parseFloat(urlParams.get("workHours"));
      if (!isNaN(workHours)) urlSettings.workHours = workHours;
    }
    if (urlParams.has("workDaysPerWeek")) {
      const workDays = parseFloat(urlParams.get("workDaysPerWeek"));
      if (!isNaN(workDays)) urlSettings.workDaysPerWeek = workDays;
    }

    if (Object.keys(urlSettings).length > 0) {
      return { ...defaults, ...urlSettings };
    }

    // Priority 2: Local Storage
    const saved = localStorage.getItem("earnTrack:settings");
    if (saved) {
      try {
        return { ...defaults, ...JSON.parse(saved) };
      } catch {
        // Fall through to defaults if JSON is invalid
      }
    }

    // Priority 3: Defaults
    return defaults;
  });

  const [currentView, setCurrentView] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasUrlSettings = [
      "salary",
      "currency",
      "cycle",
      "workHours",
      "workDaysPerWeek",
    ].some((p) => urlParams.has(p));
    if (hasUrlSettings) return "calculator";
    return localStorage.getItem("earnTrack:view") || "settings";
  });

  const [startTime, setStartTime] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasUrlSettings = [
      "salary",
      "currency",
      "cycle",
      "workHours",
      "workDaysPerWeek",
    ].some((p) => urlParams.has(p));
    if (hasUrlSettings) return Date.now();
    const savedTime = localStorage.getItem("earnTrack:startTime");
    return savedTime ? parseInt(savedTime, 10) : null;
  });

  const [isCalculating, setIsCalculating] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasUrlSettings = [
      "salary",
      "currency",
      "cycle",
      "workHours",
      "workDaysPerWeek",
    ].some((p) => urlParams.has(p));
    if (hasUrlSettings) return true;
    const savedTime = localStorage.getItem("earnTrack:startTime");
    return !!savedTime;
  });

  const [earnings, setEarnings] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const { toast } = useToast();
  const [isMobile, setIsMobile] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showResetMessage, setShowResetMessage] = useState(false);
  const lastCelebratedMilestone = useRef(0);
  const clickTimeout = useRef(null);

  const shareUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("salary", settings.salary);
    params.set("cycle", settings.cycle);
    params.set("workHours", settings.workHours);
    params.set("workDaysPerWeek", settings.workDaysPerWeek);
    params.set("currency", settings.currency);
    return `${window.location.origin}${
      window.location.pathname
    }?${params.toString()}`;
  }, [settings]);

  const appName = "躺赚时钟";
  const slogan = "每一秒，都在躺赚。";

  useEffect(() => {
    // Check for zen mode in URL on initial load
    const urlParams = new URLSearchParams(window.location.search);
    const hasUrlSettings = [
      "salary",
      "currency",
      "cycle",
      "workHours",
      "workDaysPerWeek",
    ].some((p) => urlParams.has(p));
    if (urlParams.get("mode") === "zen" || hasUrlSettings) {
      setIsZenMode(true);
    }

    const handleKeyDown = (e) => {
      if (e.key.toLowerCase() === "z") {
        setIsZenMode((prev) => !prev);
      }
      if (e.key.toLowerCase() === "r") {
        handleReset(true);
      }
      if (e.key.toLowerCase() === "p") {
        setIsPaused((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const currentMode = urlParams.get("mode");

    if (isZenMode && currentMode !== "zen") {
      urlParams.set("mode", "zen");
      window.history.replaceState(
        {},
        "",
        `${window.location.pathname}?${urlParams}`
      );
    } else if (!isZenMode && currentMode === "zen") {
      urlParams.delete("mode");
      const newSearch = urlParams.toString();
      window.history.replaceState(
        {},
        "",
        newSearch
          ? `${window.location.pathname}?${newSearch}`
          : window.location.pathname
      );
    }
  }, [isZenMode]);

  useEffect(() => {
    localStorage.setItem("earnTrack:theme", theme);
  }, [theme]);

  // Persist settings to localStorage
  useEffect(() => {
    localStorage.setItem("earnTrack:settings", JSON.stringify(settings));
  }, [settings]);

  // Persist current view to localStorage
  useEffect(() => {
    localStorage.setItem("earnTrack:view", currentView);
  }, [currentView]);

  useEffect(() => {
    const checkIsMobile = () => {
      // Using 768px as the breakpoint for "mobile", matching Tailwind's `md` breakpoint
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile(); // Initial check
    window.addEventListener("resize", checkIsMobile);

    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const selectedCurrency = currencies.find(
    (c) => c.value === settings.currency
  );
  const selectedCycle = calculationCycles.find(
    (c) => c.value === settings.cycle
  );

  const calculatePerSecondIncome = () => {
    const { salary, cycle, workHours, workDaysPerWeek } = settings;
    if (!salary || salary <= 0) return 0;

    let annualSalary = 0;
    let workSecondsPerYear = 0;

    switch (cycle) {
      case "annual":
        annualSalary = salary;
        workSecondsPerYear = workDaysPerWeek * 52 * workHours * 3600;
        break;
      case "monthly":
        annualSalary = salary * 12;
        workSecondsPerYear = workDaysPerWeek * 52 * workHours * 3600;
        break;
      case "daily":
        annualSalary = salary * workDaysPerWeek * 52;
        workSecondsPerYear = workDaysPerWeek * 52 * workHours * 3600;
        break;
      case "hourly":
        return salary / 3600;
      default:
        return 0;
    }

    if (workSecondsPerYear === 0) return 0;
    return annualSalary / workSecondsPerYear;
  };

  const perSecondIncome = calculatePerSecondIncome();

  const triggerFireworks = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min, max) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);
  };

  useEffect(() => {
    let interval;
    if (isCalculating && startTime && !isPaused) {
      interval = setInterval(() => {
        const now = Date.now();
        const elapsed = (now - startTime) / 1000;
        const currentEarnings = elapsed * perSecondIncome;
        setElapsedTime(elapsed);
        setEarnings(currentEarnings);

        const nextMilestone = celebrationMilestones.find(
          (m) => m > lastCelebratedMilestone.current
        );
        if (nextMilestone && currentEarnings >= nextMilestone) {
          lastCelebratedMilestone.current = nextMilestone;
          toast({
            title: `🎉 恭喜！`,
            description: `已赚取 ${nextMilestone} 元！`,
          });
          triggerFireworks();
        }
      }, 50); // Interval can be a bit longer for performance
    }
    return () => clearInterval(interval);
  }, [isCalculating, startTime, perSecondIncome, toast, isPaused]);

  const handleStartCalculation = () => {
    if (!settings.salary || settings.salary <= 0) {
      toast({
        title: "参数错误",
        description: "请输入有效的薪资金额",
        variant: "destructive",
      });
      return;
    }

    setIsPaused(false);
    lastCelebratedMilestone.current = 0;
    const now = Date.now();
    setStartTime(now);
    localStorage.setItem("earnTrack:startTime", String(now));
    setIsCalculating(true);
    setCurrentView("calculator");
    setEarnings(0);
    setElapsedTime(0);
  };

  const handleReset = (fromShortcut = false) => {
    if (!fromShortcut) {
      localStorage.removeItem("earnTrack:startTime");
    }
    lastCelebratedMilestone.current = 0;
    setIsCalculating(false);
    setIsPaused(false);
    setStartTime(null);
    setEarnings(0);
    setElapsedTime(0);
    if (!fromShortcut) {
      setCurrentView("settings");
    } else {
      setShowResetMessage(true);
      setTimeout(() => setShowResetMessage(false), 1500);

      const now = Date.now();
      setStartTime(now);
      localStorage.setItem("earnTrack:startTime", String(now));
      setIsCalculating(true);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatEarnings = (amount) => {
    return amount.toFixed(isMobile ? 6 : 8);
  };

  const handleCycleChange = (value) => {
    const newSalary = quickSelectOptions[value][0].value;
    setSettings((prev) => ({ ...prev, cycle: value, salary: newSalary }));
  };

  const handleDragEnd = (event, info) => {
    // Detect a sharp swipe upwards or downwards to reset
    if (Math.abs(info.offset.y) > 100 && Math.abs(info.velocity.y) > 500) {
      handleReset(true);
    }
  };

  const handleClick = () => {
    // This function now robustly handles both single and double clicks
    if (clickTimeout.current) {
      // This is a double click
      clearTimeout(clickTimeout.current);
      clickTimeout.current = null;
      setIsPaused((prev) => !prev);
    } else {
      // This is the first click, might be a single click
      clickTimeout.current = setTimeout(() => {
        setIsZenMode((prev) => !prev);
        clickTimeout.current = null;
      }, 250); // 250ms is a common delay for double click detection
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`${shareUrl}&mode=zen`);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <HelmetProvider>
      <>
        <Helmet>
          <title>{appName}</title>
          <meta
            name="description"
            content="躺赚时钟 - 一款能实时显示您财富增长的沉浸式时钟。无论是努力工作还是片刻摸鱼，每一秒的价值都清晰可见，让赚钱的快乐伴随您左右。"
          />
          <meta
            name="keywords"
            content="躺赚时钟, 躺赚, 实时工资, 薪水计算器, 摸鱼, 时间变现, 财富增长, 被动收入, 工作动力"
          />
          <meta property="og:title" content={appName} />
          <meta
            property="og:description"
            content="无论是努力工作还是片刻摸鱼，每一秒的价值都清晰可见。"
          />
          <meta property="og:type" content="website" />
          <meta property="og:url" content="https://earn-track.vercel.app/" />
          {/* og:image is removed as it requires a PNG/JPG. Add it back when you have one. */}
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={appName} />
          <meta
            name="twitter:description"
            content="无论是努力工作还是片刻摸鱼，每一秒的价值都清晰可见。"
          />
          {/* twitter:image is removed as it requires a PNG/JPG. Add it back when you have one. */}
          <link rel="icon" type="image/svg+xml" href="/icon.svg" />
          <link rel="manifest" href="/site.webmanifest" />
        </Helmet>

        <motion.div
          onClick={handleClick}
          className={`min-h-screen ${
            theme === "dark"
              ? "bg-gradient-to-br from-gray-900 to-gray-800 text-white"
              : "bg-gray-100 text-gray-800"
          } flex flex-col items-center justify-center p-4 font-sans antialiased`}
        >
          <AnimatePresence mode="wait">
            {currentView === "settings" ? (
              <motion.div
                key="settings"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="w-full max-w-md"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <div
                  className={
                    theme === "dark"
                      ? "bg-white/10 backdrop-blur-md rounded-2xl shadow-lg border border-white/20"
                      : "bg-white rounded-2xl shadow-lg border"
                  }
                >
                  <div
                    className="flex items-center justify-between p-4 border-b"
                    style={{
                      borderColor:
                        theme === "dark"
                          ? "rgba(255,255,255,0.1)"
                          : "rgba(0,0,0,0.1)",
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-white/10 rounded-full">
                        <Calculator
                          className={`h-6 w-6 ${
                            theme === "dark" ? "text-blue-300" : "text-blue-600"
                          }`}
                        />
                      </div>
                      <h1
                        className={`text-xl md:text-2xl font-bold ${
                          theme === "dark" ? "text-white" : "text-gray-800"
                        }`}
                      >
                        躺赚时钟
                      </h1>
                    </div>
                    <div className="absolute top-4 right-4">
                      <Button
                        onClick={toggleTheme}
                        variant="ghost"
                        size="icon"
                        className={
                          theme === "dark"
                            ? "text-gray-400 hover:bg-white/10 hover:text-white"
                            : "text-gray-500 hover:bg-black/10"
                        }
                      >
                        {theme === "dark" ? (
                          <Sun className="h-5 w-5" />
                        ) : (
                          <Moon className="h-5 w-5" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="p-6 md:p-8 space-y-6">
                    <div className="space-y-2">
                      <Label
                        htmlFor="cycle"
                        className={`font-medium ${
                          theme === "dark" ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        计算周期
                      </Label>
                      <Select
                        value={settings.cycle}
                        onValueChange={handleCycleChange}
                      >
                        <SelectTrigger
                          id="cycle"
                          className={
                            theme === "dark"
                              ? "bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
                              : "bg-white border-gray-300 text-gray-800"
                          }
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent
                          className={
                            theme === "dark"
                              ? "bg-gray-800 border-gray-600 text-white"
                              : "bg-white border-gray-300 text-gray-800"
                          }
                        >
                          {calculationCycles.map((cycle) => (
                            <SelectItem
                              key={cycle.value}
                              value={cycle.value}
                              className={
                                theme === "dark"
                                  ? "focus:bg-gray-700"
                                  : "focus:bg-gray-100"
                              }
                            >
                              {cycle.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="salary"
                        className={`font-medium ${
                          theme === "dark" ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        薪资金额 ({selectedCurrency?.symbol})
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="salary"
                          type="number"
                          placeholder="例如: 12000"
                          value={settings.salary}
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              salary: parseFloat(e.target.value),
                            }))
                          }
                          className={
                            theme === "dark"
                              ? "bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
                              : "bg-white border-gray-300 text-gray-800 placeholder:text-gray-400"
                          }
                        />
                        <HoverCard>
                          <HoverCardTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className={`flex-shrink-0 ${
                                theme === "dark"
                                  ? "bg-transparent border-gray-600 hover:bg-white/20"
                                  : "bg-white border-gray-300 hover:bg-gray-100"
                              }`}
                            >
                              <Sparkles className="h-4 w-4 text-yellow-400" />
                            </Button>
                          </HoverCardTrigger>
                          <HoverCardContent
                            className={`w-auto p-2 ${
                              theme === "dark"
                                ? "bg-gray-800 border-gray-600"
                                : "bg-white border-gray-200"
                            }`}
                          >
                            <div className="grid grid-cols-2 gap-2">
                              {quickSelectOptions[settings.cycle].map((opt) => (
                                <Button
                                  key={opt.value}
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSettings((prev) => ({
                                      ...prev,
                                      salary: opt.value,
                                    }));
                                  }}
                                  className={
                                    theme === "dark"
                                      ? "bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-700"
                                      : "border-gray-300 text-gray-600 hover:bg-gray-100"
                                  }
                                >
                                  {opt.label}
                                </Button>
                              ))}
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                      </div>
                    </div>

                    {settings.cycle !== "hourly" && (
                      <div className="space-y-2">
                        <Label
                          htmlFor="workHours"
                          className={`font-medium ${
                            theme === "dark" ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          每天工作（小时）
                        </Label>
                        <Input
                          id="workHours"
                          type="number"
                          min="1"
                          max="24"
                          value={settings.workHours}
                          onChange={(e) => {
                            const value = e.target.value;
                            setSettings((prev) => ({
                              ...prev,
                              workHours:
                                value === "" ? "" : parseFloat(e.target.value),
                            }));
                          }}
                          onBlur={(e) => {
                            const value = parseFloat(e.target.value);
                            if (isNaN(value) || value < 1 || value > 24) {
                              setSettings((prev) => ({
                                ...prev,
                                workHours: 8,
                              }));
                            }
                          }}
                          className={
                            theme === "dark"
                              ? "bg-gray-800/50 border-gray-600 text-white"
                              : "bg-white border-gray-300 text-gray-800"
                          }
                        />
                      </div>
                    )}

                    {settings.cycle !== "hourly" &&
                      settings.cycle !== "daily" && (
                        <div className="space-y-2">
                          <Label
                            htmlFor="workDays"
                            className={`font-medium ${
                              theme === "dark"
                                ? "text-gray-300"
                                : "text-gray-700"
                            }`}
                          >
                            每周工作天数
                          </Label>
                          <Select
                            value={settings.workDaysPerWeek}
                            onValueChange={(value) =>
                              setSettings((prev) => ({
                                ...prev,
                                workDaysPerWeek: parseFloat(value),
                              }))
                            }
                          >
                            <SelectTrigger
                              id="workDays"
                              className={
                                theme === "dark"
                                  ? "bg-gray-800/50 border-gray-600 text-white"
                                  : "bg-white border-gray-300 text-gray-800"
                              }
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent
                              className={
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white"
                                  : "bg-white border-gray-300 text-gray-800"
                              }
                            >
                              {workDaysOptions.map((opt) => (
                                <SelectItem
                                  key={opt.value}
                                  value={opt.value}
                                  className={
                                    theme === "dark"
                                      ? "focus:bg-gray-700"
                                      : "focus:bg-gray-100"
                                  }
                                >
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                    <div className="space-y-2">
                      <Label
                        htmlFor="currency"
                        className={`font-medium ${
                          theme === "dark" ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        货币类型
                      </Label>
                      <Select
                        value={settings.currency}
                        onValueChange={(value) =>
                          setSettings((prev) => ({ ...prev, currency: value }))
                        }
                      >
                        <SelectTrigger
                          id="currency"
                          className={
                            theme === "dark"
                              ? "bg-gray-800/50 border-gray-600 text-white"
                              : "bg-white border-gray-300 text-gray-800"
                          }
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent
                          className={
                            theme === "dark"
                              ? "bg-gray-800 border-gray-600 text-white"
                              : "bg-white border-gray-300 text-gray-800"
                          }
                        >
                          {currencies.map((currency) => (
                            <SelectItem
                              key={currency.value}
                              value={currency.value}
                              className={
                                theme === "dark"
                                  ? "focus:bg-gray-700"
                                  : "focus:bg-gray-100"
                              }
                            >
                              {currency.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      onClick={handleStartCalculation}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg text-base transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-500/50"
                    >
                      <Play className="h-5 w-5 mr-2" />
                      开始计算
                    </Button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="calculator"
                drag="y"
                onDragEnd={handleDragEnd}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="w-full h-full flex flex-col items-center justify-center text-center p-4 cursor-pointer"
              >
                <motion.div
                  className="absolute top-4 left-4 md:top-6 md:left-6"
                  animate={{ opacity: isZenMode ? 0 : 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className={
                      theme === "dark"
                        ? "text-gray-400 hover:bg-white/10 hover:text-white"
                        : "text-gray-500 hover:bg-black/10"
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReset();
                    }}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </motion.div>
                <motion.div
                  className="absolute top-4 right-4 md:top-6 md:right-6 flex items-center gap-2"
                  animate={{ opacity: isZenMode ? 0 : 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTheme();
                    }}
                    variant="ghost"
                    size="icon"
                    className={
                      theme === "dark"
                        ? "text-gray-400 hover:bg-white/10 hover:text-white"
                        : "text-gray-500 hover:bg-black/10"
                    }
                  >
                    {theme === "dark" ? (
                      <Sun className="h-5 w-5" />
                    ) : (
                      <Moon className="h-5 w-5" />
                    )}
                  </Button>
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={
                          theme === "dark"
                            ? "text-gray-400 hover:bg-white/10 hover:text-white"
                            : "text-gray-500 hover:bg-black/10"
                        }
                        onClick={(e) => { e.stopPropagation(); }}
                      >
                        <HelpCircle className="h-5 w-5" />
                      </Button>
                    </HoverCardTrigger>
                    <HoverCardContent
                      className={`w-80 ${
                        theme === "dark"
                          ? "bg-gray-800/80 border-gray-700 text-white"
                          : "bg-white/80 border-gray-200 text-gray-800"
                      } backdrop-blur-lg`}
                      sideOffset={10}
                    >
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-bold text-lg mb-2">
                            欢迎使用 {appName}！
                          </h3>
                          <p className="text-sm opacity-80">
                            这是一个能实时见证您财富增长的工具。非常适合在工作时作为屏保或桌面伴侣，给您持续的动力。
                          </p>
                        </div>

                        <div className="p-3 rounded-lg bg-yellow-400/20 text-yellow-300">
                          <p className="text-xs font-bold leading-relaxed">
                            <span className="font-extrabold">注意:</span>{" "}
                            手机壁纸模式下，由于系统限制，无法使用手势交互（双击、滑动等）。
                          </p>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2">
                            如何设置为屏保？
                          </h4>
                          <ul className="list-disc list-inside text-sm space-y-1 opacity-80">
                            <li>
                              <strong className="text-white/90">
                                Windows:
                              </strong>{" "}
                              使用 Lively Wallpaper
                              或类似软件，将本页面设为壁纸。
                            </li>
                            <li>
                              <strong className="text-white/90">macOS:</strong>{" "}
                              使用 Plash 或 WebLocker 等应用。
                            </li>
                            <li>
                              <strong className="text-white/90">
                                Android/iOS:
                              </strong>{" "}
                              大部分系统支持将网页快捷方式添加到主屏幕。
                            </li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">
                            您的专属配置链接
                          </h4>
                          <p className="text-xs opacity-70 mb-2">
                            复制并分享此链接，或在屏保软件中打开，即可恢复当前所有设置。
                          </p>
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              readOnly
                              value={`${shareUrl}&mode=zen`}
                              className="w-full px-2 py-1 text-xs bg-white/10 rounded border border-white/20"
                            />
                            <button
                              onClick={handleCopy}
                              className="px-3 py-1 text-xs bg-emerald-500/20 text-emerald-300 rounded hover:bg-emerald-500/40 transition-colors"
                            >
                              复制
                            </button>
                          </div>
                        </div>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </motion.div>

                <div className="flex flex-col items-center justify-center space-y-4 md:space-y-8">
                  <div>
                    <p
                      className={`text-lg md:text-xl ${
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      } mb-2`}
                    >
                      {showResetMessage
                        ? "已重置"
                        : isPaused
                        ? "已暂停"
                        : "已赚取"}
                    </p>
                    <motion.div
                      className="break-all text-5xl sm:text-6xl md:text-7xl lg:text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300 py-2 font-mono"
                      animate={{ scale: [1, 1.01, 1] }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    >
                      {selectedCurrency?.symbol}
                      {formatEarnings(earnings)}
                    </motion.div>
                  </div>

                  <motion.div
                    className={`w-full max-w-sm rounded-xl p-4 space-y-3 text-sm ${
                      theme === "dark"
                        ? "bg-white/5 backdrop-blur-sm border border-white/10"
                        : "bg-white/60 border"
                    }`}
                    animate={{
                      opacity: isZenMode ? 0 : 1,
                      y: isZenMode ? 20 : 0,
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    <div
                      className={`flex justify-between items-center ${
                        theme === "dark" ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-blue-500" />
                        {selectedCycle?.label}
                      </span>
                      <span>
                        {selectedCurrency?.symbol}
                        {settings.salary.toLocaleString()}
                      </span>
                    </div>
                    <div
                      className={`flex justify-between items-center ${
                        theme === "dark" ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-500" />
                        每秒收入
                      </span>
                      <span className="font-mono">
                        {selectedCurrency?.symbol}
                        {perSecondIncome.toFixed(8)}
                      </span>
                    </div>
                    {settings.cycle !== "hourly" && (
                      <div
                        className={`flex justify-between items-center ${
                          theme === "dark" ? "text-gray-300" : "text-gray-600"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Sun className="h-4 w-4 text-yellow-500" />
                          每天工作
                        </span>
                        <span>{settings.workHours} 小时</span>
                      </div>
                    )}
                    {settings.cycle !== "hourly" &&
                      settings.cycle !== "daily" && (
                        <div
                          className={`flex justify-between items-center ${
                            theme === "dark" ? "text-gray-300" : "text-gray-600"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-purple-500" />
                            每周工作
                          </span>
                          <span>{settings.workDaysPerWeek} 天</span>
                        </div>
                      )}
                  </motion.div>

                  <div
                    className={`flex items-center justify-center gap-2 md:gap-3 ${
                      theme === "dark" ? "text-gray-400" : "text-gray-500"
                    } pt-4`}
                  >
                    <Clock className="h-5 w-5 md:h-6 md:w-6" />
                    <span className="font-mono text-2xl md:text-3xl tracking-wider">
                      {formatTime(elapsedTime)}
                    </span>
                  </div>
                </div>
                <motion.div
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-gray-500/80 bg-black/10 px-3 py-1.5 rounded-full pointer-events-none"
                  animate={{ opacity: isZenMode ? 0 : 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {isMobile
                    ? "上滑重置 · 双击暂停 · 单击禅定"
                    : "R键重置 · P键暂停 · Z键禅定"}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <Toaster theme={theme} />
        </motion.div>
      </>
    </HelmetProvider>
  );
}

export default App;
