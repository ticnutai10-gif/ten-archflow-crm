import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Mail,
  Clock,
  TrendingUp,
  Briefcase,
  Users,
  Target,
  Award,
  Star,
  Zap,
  Calendar,
  BarChart3,
  Search,
  Filter,
  Crown,
  Trophy,
  Flame,
  Activity,
  ChevronRight,
  ArrowUpRight,
  TrendingDown
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval } from "date-fns";
import { he } from "date-fns/locale";

const PREMIUM_GRADIENTS = [
  { from: '#667eea', to: '#764ba2', name: 'סגול מלכותי' },
  { from: '#f093fb', to: '#f5576c', name: 'ורוד זוהר' },
  { from: '#4facfe', to: '#00f2fe', name: 'כחול אוקיינוס' },
  { from: '#43e97b', to: '#38f9d7', name: 'ירוק נעורים' },
  { from: '#fa709a', to: '#fee140', name: 'שקיעה חמה' },
  { from: '#30cfd0', to: '#330867', name: 'לילה כחול' }
];

const TIER_CONFIGS = {
  platinum: { 
    threshold: 40, 
    gradient: 'from-slate-300 via-slate-100 to-slate-300',
    icon: Crown,
    label: 'פלטינום',
    glow: 'shadow-slate-300'
  },
  gold: { 
    threshold: 30, 
    gradient: 'from-yellow-400 via-yellow-200 to-yellow-400',
    icon: Trophy,
    label: 'זהב',
    glow: 'shadow-yellow-300'
  },
  silver: { 
    threshold: 20, 
    gradient: 'from-slate-400 via-slate-300 to-slate-400',
    icon: Award,
    label: 'כסף',
    glow: 'shadow-slate-300'
  },
  bronze: { 
    threshold: 10, 
    gradient: 'from-orange-400 via-orange-300 to-orange-400',
    icon: Star,
    label: 'ברונזה',
    glow: 'shadow-orange-300'
  },
  starter: { 
    threshold: 0, 
    gradient: 'from-purple-400 via-purple-300 to-purple-400',
    icon: Zap,
    label: 'מתחיל',
    glow: 'shadow-purple-300'
  }
};

function getEmployeeTier(hours) {
  if (hours >= TIER_CONFIGS.platinum.threshold) return 'platinum';
  if (hours >= TIER_CONFIGS.gold.threshold) return 'gold';
  if (hours >= TIER_CONFIGS.silver.threshold) return 'silver';
  if (hours >= TIER_CONFIGS.bronze.threshold) return 'bronze';
  return 'starter';
}

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours === 0) return `${minutes}ד'`;
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
}

export default function UserAnalyticsDashboard({ timeLogs }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [sortBy, setSortBy] = useState("hours");
  const [viewStyle, setViewStyle] = useState("cards");
  const [selectedGradient, setSelectedGradient] = useState(0);

  const currentGradient = PREMIUM_GRADIENTS[selectedGradient];

  // חישוב נתוני משתמשים
  const userData = useMemo(() => {
    const userMap = new Map();

    timeLogs.forEach(log => {
      const email = log.created_by || 'unknown@system.local';
      
      if (!userMap.has(email)) {
        userMap.set(email, {
          email,
          name: email.split('@')[0],
          domain: email.split('@')[1] || 'local',
          totalSeconds: 0,
          totalHours: 0,
          sessions: 0,
          clients: new Set(),
          projects: new Set(),
          dailyLogs: [],
          weeklyPattern: Array(7).fill(0),
          clientBreakdown: new Map(),
          recentActivity: []
        });
      }

      const user = userMap.get(email);
      user.totalSeconds += log.duration_seconds || 0;
      user.totalHours = user.totalSeconds / 3600;
      user.sessions += 1;
      
      if (log.client_name) user.clients.add(log.client_name);
      if (log.project_name) user.projects.add(log.project_name);
      
      user.dailyLogs.push({
        date: log.log_date,
        hours: (log.duration_seconds || 0) / 3600,
        client: log.client_name,
        title: log.title
      });

      const dayOfWeek = new Date(log.log_date).getDay();
      user.weeklyPattern[dayOfWeek] += (log.duration_seconds || 0) / 3600;

      if (log.client_name) {
        const current = user.clientBreakdown.get(log.client_name) || 0;
        user.clientBreakdown.set(log.client_name, current + (log.duration_seconds || 0) / 3600);
      }

      user.recentActivity.push({
        date: log.log_date,
        client: log.client_name,
        title: log.title,
        duration: log.duration_seconds
      });
    });

    return Array.from(userMap.values()).map(user => ({
      ...user,
      clients: Array.from(user.clients),
      projects: Array.from(user.projects),
      tier: getEmployeeTier(user.totalHours),
      avgHoursPerDay: user.totalHours / 7,
      productivity: Math.min((user.totalHours / 40) * 100, 100),
      topClient: Array.from(user.clientBreakdown.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'אין',
      recentActivity: user.recentActivity.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5)
    })).sort((a, b) => {
      switch(sortBy) {
        case 'hours': return b.totalHours - a.totalHours;
        case 'sessions': return b.sessions - a.sessions;
        case 'clients': return b.clients.length - a.clients.length;
        case 'name': return a.name.localeCompare(b.name, 'he');
        default: return 0;
      }
    });
  }, [timeLogs, sortBy]);

  const filteredUsers = searchTerm
    ? userData.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : userData;

  // נתונים סטטיסטיים כלליים
  const totalUsers = userData.length;
  const totalHours = userData.reduce((sum, u) => sum + u.totalHours, 0);
  const avgHoursPerUser = totalHours / totalUsers || 0;
  const topPerformer = userData[0];

  // נתוני תרשים התפלגות דרגות
  const tierDistribution = Object.keys(TIER_CONFIGS).map(tier => ({
    name: TIER_CONFIGS[tier].label,
    count: userData.filter(u => u.tier === tier).length,
    fill: PREMIUM_GRADIENTS[Object.keys(TIER_CONFIGS).indexOf(tier) % PREMIUM_GRADIENTS.length].from
  }));

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header with gradient */}
      <div 
        className="rounded-2xl p-8 text-white shadow-2xl relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${currentGradient.from} 0%, ${currentGradient.to} 100%)`
        }}
      >
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold mb-2">ניתוח משתמשים מתקדם</h2>
              <p className="text-white/90">מעקב מפורט אחר ביצועים ופעילות</p>
            </div>
            <div className="flex items-center gap-2">
              {PREMIUM_GRADIENTS.map((gradient, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedGradient(index)}
                  className={`w-10 h-10 rounded-full border-2 ${selectedGradient === index ? 'border-white scale-110' : 'border-white/30'} transition-all`}
                  style={{
                    background: `linear-gradient(135deg, ${gradient.from} 0%, ${gradient.to} 100%)`
                  }}
                  title={gradient.name}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-5 h-5" />
                <span className="text-sm">סה"כ משתמשים</span>
              </div>
              <div className="text-3xl font-bold">{totalUsers}</div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-5 h-5" />
                <span className="text-sm">סה"כ שעות</span>
              </div>
              <div className="text-3xl font-bold">{Math.round(totalHours)}</div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-5 h-5" />
                <span className="text-sm">ממוצע למשתמש</span>
              </div>
              <div className="text-3xl font-bold">{Math.round(avgHoursPerUser)}ש'</div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-5 h-5" />
                <span className="text-sm">מוביל</span>
              </div>
              <div className="text-lg font-bold truncate">{topPerformer?.name || 'אין'}</div>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="חפש משתמש לפי שם או מייל..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="מיין לפי" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hours">שעות עבודה</SelectItem>
            <SelectItem value="sessions">מספר רישומים</SelectItem>
            <SelectItem value="clients">מספר לקוחות</SelectItem>
            <SelectItem value="name">שם (א-ת)</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Button
            variant={viewStyle === 'cards' ? 'default' : 'outline'}
            onClick={() => setViewStyle('cards')}
            size="icon"
          >
            <BarChart3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewStyle === 'list' ? 'default' : 'outline'}
            onClick={() => setViewStyle('list')}
            size="icon"
          >
            <Users className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Users Grid/List */}
      {viewStyle === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredUsers.map((user, index) => {
              const tierConfig = TIER_CONFIGS[user.tier];
              const TierIcon = tierConfig.icon;

              return (
                <motion.div
                  key={user.email}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card 
                    className={`relative overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer group ${tierConfig.glow}`}
                    onClick={() => setSelectedUser(user)}
                  >
                    {/* Tier badge */}
                    <div className={`absolute top-4 left-4 bg-gradient-to-r ${tierConfig.gradient} p-2 rounded-full shadow-lg`}>
                      <TierIcon className="w-5 h-5 text-slate-700" />
                    </div>

                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-4">
                        <Avatar className="w-16 h-16 border-4 border-white shadow-lg">
                          <AvatarFallback 
                            className="text-xl font-bold text-white"
                            style={{
                              background: `linear-gradient(135deg, ${PREMIUM_GRADIENTS[index % PREMIUM_GRADIENTS.length].from} 0%, ${PREMIUM_GRADIENTS[index % PREMIUM_GRADIENTS.length].to} 100%)`
                            }}
                          >
                            {user.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-slate-900 mb-1">{user.name}</h3>
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Mail className="w-3 h-3" />
                            <span className="truncate">{user.email}</span>
                          </div>
                          <Badge variant="outline" className="mt-2 text-xs">
                            {tierConfig.label}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-slate-500 mb-1">סה"כ שעות</div>
                          <div className="text-2xl font-bold text-blue-600">
                            {Math.round(user.totalHours)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 mb-1">רישומים</div>
                          <div className="text-2xl font-bold text-purple-600">
                            {user.sessions}
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-500 mb-2">לקוחות ({user.clients.length})</div>
                        <div className="flex flex-wrap gap-1">
                          {user.clients.slice(0, 3).map((client, idx) => (
                            <Badge key={idx} variant="secondary" className="text-[10px]">
                              {client}
                            </Badge>
                          ))}
                          {user.clients.length > 3 && (
                            <Badge variant="outline" className="text-[10px]">
                              +{user.clients.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="pt-3 border-t flex items-center justify-between text-xs text-slate-500">
                        <span>לקוח מוביל: {user.topClient}</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-[-4px] transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredUsers.map((user, index) => {
                const tierConfig = TIER_CONFIGS[user.tier];
                const TierIcon = tierConfig.icon;

                return (
                  <div
                    key={user.email}
                    className="p-4 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-4"
                    onClick={() => setSelectedUser(user)}
                  >
                    <div className="text-slate-400 font-mono text-sm w-8">
                      {(index + 1).toString().padStart(2, '0')}
                    </div>

                    <Avatar className="w-12 h-12">
                      <AvatarFallback 
                        className="font-bold text-white"
                        style={{
                          background: `linear-gradient(135deg, ${PREMIUM_GRADIENTS[index % PREMIUM_GRADIENTS.length].from} 0%, ${PREMIUM_GRADIENTS[index % PREMIUM_GRADIENTS.length].to} 100%)`
                        }}
                      >
                        {user.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="font-semibold text-slate-900">{user.name}</div>
                      <div className="text-sm text-slate-500">{user.email}</div>
                    </div>

                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <div className="font-bold text-blue-600">{Math.round(user.totalHours)}ש'</div>
                        <div className="text-xs text-slate-500">שעות</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-purple-600">{user.sessions}</div>
                        <div className="text-xs text-slate-500">רישומים</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-green-600">{user.clients.length}</div>
                        <div className="text-xs text-slate-500">לקוחות</div>
                      </div>
                    </div>

                    <div className={`p-2 rounded-full bg-gradient-to-r ${tierConfig.gradient}`}>
                      <TierIcon className="w-5 h-5 text-slate-700" />
                    </div>

                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Details Dialog */}
      {selectedUser && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedUser(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
          >
            <div 
              className="p-8 text-white relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${currentGradient.from} 0%, ${currentGradient.to} 100%)`
              }}
            >
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 left-4 text-white hover:bg-white/20"
                onClick={() => setSelectedUser(null)}
              >
                ✕
              </Button>

              <div className="flex items-center gap-6 mb-6">
                <Avatar className="w-24 h-24 border-4 border-white shadow-xl">
                  <AvatarFallback className="text-3xl font-bold bg-white/20">
                    {selectedUser.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <h2 className="text-3xl font-bold mb-2">{selectedUser.name}</h2>
                  <p className="text-white/90 mb-3">{selectedUser.email}</p>
                  <Badge className="bg-white/20">
                    {TIER_CONFIGS[selectedUser.tier].label}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <Clock className="w-6 h-6 mb-2" />
                  <div className="text-2xl font-bold">{Math.round(selectedUser.totalHours)}</div>
                  <div className="text-sm text-white/80">שעות עבודה</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <Activity className="w-6 h-6 mb-2" />
                  <div className="text-2xl font-bold">{selectedUser.sessions}</div>
                  <div className="text-sm text-white/80">רישומים</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <Users className="w-6 h-6 mb-2" />
                  <div className="text-2xl font-bold">{selectedUser.clients.length}</div>
                  <div className="text-sm text-white/80">לקוחות</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <Briefcase className="w-6 h-6 mb-2" />
                  <div className="text-2xl font-bold">{selectedUser.projects.length}</div>
                  <div className="text-sm text-white/80">פרויקטים</div>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-6">
              {/* Client breakdown */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  פילוח לקוחות
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {Array.from(selectedUser.clientBreakdown.entries())
                    .sort((a, b) => b[1] - a[1])
                    .map(([client, hours]) => (
                      <div key={client} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <span className="text-sm font-medium truncate flex-1">{client}</span>
                        <Badge variant="secondary">{Math.round(hours * 10) / 10}ש'</Badge>
                      </div>
                    ))}
                </div>
              </div>

              {/* Recent activity */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  פעילות אחרונה
                </h3>
                <div className="space-y-2">
                  {selectedUser.recentActivity.map((activity, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{activity.title || 'פעילות'}</div>
                        <div className="text-xs text-slate-500">{activity.client}</div>
                      </div>
                      <div className="text-xs text-slate-500">{format(new Date(activity.date), 'dd/MM', { locale: he })}</div>
                      <Badge variant="outline" className="text-xs">{formatDuration(activity.duration)}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}