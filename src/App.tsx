import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock,
  Coins,
  Download,
  GraduationCap,
  Home,
  Landmark,
  Moon,
  Pencil,
  Plus,
  Save,
  Settings,
  Trash2,
  UserCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import clsx from 'clsx';

type Tab =
  | 'overview'
  | 'calendar'
  | 'classes'
  | 'makeup'
  | 'judge'
  | 'trial'
  | 'holidays'
  | 'salary'
  | 'settings';

type WorkStatus = 'planned' | 'confirmed' | 'cancelled';

type Course = {
  id: string;
  code: string;
  startDate: string;
  weekday: number;
  startTime: string;
  totalSessions: number;
};

type HolidayRange = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  applyTo: 'all' | string;
};

type SessionOverride = {
  key: string;
  status: WorkStatus;
};

type ExtraWorkType = 'makeup' | 'judge' | 'trial';

type ExtraWork = {
  id: string;
  type: ExtraWorkType;
  classCode?: string;
  datetime: string;
  hours?: number;
  students?: string;
  studentCount?: number;
  trialMode?: 'ONL' | 'OFF';
  campus?: string;
  status: WorkStatus;
  note?: string;
};

type SalaryRate = {
  id: string;
  effectiveDate: string;
  teacherRatePerSession: number;
};

type SalarySettings = {
  salaryHistory: SalaryRate[];
  makeUpRatio: number;
  judgeRatePerSession: number;
  trialOnlineRatePerStudent: number;
  trialOfflineBaseRate: number;
  trialOfflineBonusPerStudent: number;
};

type GeneratedSession = {
  key: string;
  courseId: string;
  courseCode: string;
  sessionNo: number;
  date: string;
  weekday: number;
  startTime: string;
  endTime: string;
  status: WorkStatus;
  amount: number;
};

type SkippedHoliday = {
  id: string;
  courseId: string;
  courseCode: string;
  date: string;
  title: string;
};

const STORAGE_KEYS = {
  courses: 'teaching-income-web-courses-v2',
  holidays: 'teaching-income-web-holidays-v2',
  overrides: 'teaching-income-web-overrides-v2',
  extras: 'teaching-income-web-extras-v2',
  settings: 'teaching-income-web-settings-v2',
};

const defaultSettings: SalarySettings = {
  salaryHistory: [
    {
      id: 'default-rate',
      effectiveDate: '2026-01-01',
      teacherRatePerSession: 300000,
    },
  ],
  makeUpRatio: 0.375,
  judgeRatePerSession: 300000,
  trialOnlineRatePerStudent: 40000,
  trialOfflineBaseRate: 80000,
  trialOfflineBonusPerStudent: 30000,
};

const weekdayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function currentMonthISO() {
  return new Date().toISOString().slice(0, 7);
}

function money(value: number) {
  return Math.round(value).toLocaleString('vi-VN') + 'đ';
}

function parseDate(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toISO(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');

  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDateVN(date: string) {
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y}`;
}

function formatDateTimeVN(datetime: string) {
  const [date, time] = datetime.split('T');
  return `${formatDateVN(date)} ${time}`;
}

function dateFromDateTime(datetime: string) {
  return datetime.slice(0, 10);
}

function timeFromDateTime(datetime: string) {
  return datetime.slice(11, 16);
}

function datetimeNowLocal() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');

  return `${y}-${m}-${d}T${h}:${min}`;
}

function nativeWeekdayToMondayIndex(nativeDay: number) {
  // JS: 0 CN, 1 T2...
  return nativeDay === 0 ? 6 : nativeDay - 1;
}

function getNativeWeekday(date: string) {
  return parseDate(date).getDay();
}

function getMondayIndex(date: string) {
  return nativeWeekdayToMondayIndex(getNativeWeekday(date));
}

function getMonthLabel(month: string) {
  const [y, m] = month.split('-');
  return `Tháng ${Number(m)}/${y}`;
}

function nextMonth(month: string) {
  const [y, m] = month.split('-').map(Number);
  const date = new Date(y, m - 1, 1);
  date.setMonth(date.getMonth() + 1);
  return toISO(date).slice(0, 7);
}

function prevMonth(month: string) {
  const [y, m] = month.split('-').map(Number);
  const date = new Date(y, m - 1, 1);
  date.setMonth(date.getMonth() - 1);
  return toISO(date).slice(0, 7);
}

function getDaysInMonth(month: string) {
  const [year, m] = month.split('-').map(Number);
  const lastDay = new Date(year, m, 0).getDate();

  return Array.from({ length: lastDay }, (_, index) => {
    const day = String(index + 1).padStart(2, '0');
    return `${year}-${String(m).padStart(2, '0')}-${day}`;
  });
}

function addHoursToTime(time: string, hours: number) {
  const [h, m] = time.split(':').map(Number);
  const totalMinutes = h * 60 + m + hours * 60;
  const nextH = Math.floor(totalMinutes / 60) % 24;
  const nextM = totalMinutes % 60;

  return `${String(nextH).padStart(2, '0')}:${String(nextM).padStart(2, '0')}`;
}

function getTeacherRateForDate(settings: SalarySettings, date: string) {
  const history = [...settings.salaryHistory].sort((a, b) =>
    a.effectiveDate.localeCompare(b.effectiveDate)
  );

  let rate = history[0]?.teacherRatePerSession || 300000;

  for (const item of history) {
    if (item.effectiveDate <= date) {
      rate = item.teacherRatePerSession;
    }
  }

  return rate;
}

function getMakeupRatePerHour(settings: SalarySettings, date: string) {
  return getTeacherRateForDate(settings, date) * settings.makeUpRatio;
}

function getDefaultStatusByDate(date: string): WorkStatus {
  return date < todayISO() ? 'confirmed' : 'planned';
}

function isPaidStatus(status: WorkStatus) {
  return status === 'planned' || status === 'confirmed';
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function isDateInRange(date: string, startDate: string, endDate: string) {
  return date >= startDate && date <= endDate;
}

function getHolidayForCourse(date: string, courseId: string, holidays: HolidayRange[]) {
  return holidays.find(
    (holiday) =>
      isDateInRange(date, holiday.startDate, holiday.endDate) &&
      (holiday.applyTo === 'all' || holiday.applyTo === courseId)
  );
}

function generateCourseSchedule(
  course: Course,
  holidays: HolidayRange[],
  overrides: SessionOverride[],
  settings: SalarySettings
) {
  const sessions: GeneratedSession[] = [];
  const skippedHolidays: SkippedHoliday[] = [];

  let cursor = parseDate(course.startDate);
  const nativeWeekday = cursor.getDay();

  if (nativeWeekday !== course.weekday) {
    const diff = (course.weekday - nativeWeekday + 7) % 7;
    cursor = addDays(cursor, diff);
  }

  let sessionNo = 1;
  let safety = 0;

  while (sessionNo <= course.totalSessions && safety < 120) {
    const date = toISO(cursor);
    const holiday = getHolidayForCourse(date, course.id, holidays);

    if (holiday) {
      skippedHolidays.push({
        id: `${course.id}-${date}`,
        courseId: course.id,
        courseCode: course.code,
        date,
        title: holiday.title,
      });

      cursor = addDays(cursor, 7);
      safety += 1;
      continue;
    }

    const key = `${course.id}-${sessionNo}`;
    const override = overrides.find((item) => item.key === key);
    const status = override?.status || getDefaultStatusByDate(date);
    const baseAmount = getTeacherRateForDate(settings, date);

    sessions.push({
      key,
      courseId: course.id,
      courseCode: course.code,
      sessionNo,
      date,
      weekday: course.weekday,
      startTime: course.startTime,
      endTime: addHoursToTime(course.startTime, 2),
      status,
      amount: isPaidStatus(status) ? baseAmount : 0,
    });

    sessionNo += 1;
    cursor = addDays(cursor, 7);
    safety += 1;
  }

  return { sessions, skippedHolidays };
}

function generateAllSchedules(
  courses: Course[],
  holidays: HolidayRange[],
  overrides: SessionOverride[],
  settings: SalarySettings
) {
  const sessions: GeneratedSession[] = [];
  const skippedHolidays: SkippedHoliday[] = [];

  for (const course of courses) {
    const result = generateCourseSchedule(course, holidays, overrides, settings);
    sessions.push(...result.sessions);
    skippedHolidays.push(...result.skippedHolidays);
  }

  return {
    sessions: sessions.sort((a, b) => a.date.localeCompare(b.date)),
    skippedHolidays: skippedHolidays.sort((a, b) => a.date.localeCompare(b.date)),
  };
}

function getExtraAmount(item: ExtraWork, settings: SalarySettings) {
  if (item.status === 'cancelled') return 0;

  const date = dateFromDateTime(item.datetime);

  if (item.type === 'makeup') {
    return getMakeupRatePerHour(settings, date) * (item.hours || 0);
  }

  if (item.type === 'judge') {
    return settings.judgeRatePerSession;
  }

  const studentCount = item.studentCount || 0;

  if (item.trialMode === 'ONL') {
    return settings.trialOnlineRatePerStudent * studentCount;
  }

  return settings.trialOfflineBaseRate + settings.trialOfflineBonusPerStudent * studentCount;
}

function getExtraRawAmount(item: ExtraWork, settings: SalarySettings) {
  const temp = { ...item, status: 'planned' as WorkStatus };
  return getExtraAmount(temp, settings);
}

function statusText(status: WorkStatus) {
  if (status === 'confirmed') return 'Đã xác nhận';
  if (status === 'cancelled') return 'Hủy / nghỉ';
  return 'Dự kiến';
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [selectedMonth, setSelectedMonth] = useState(currentMonthISO());

  const [courses, setCourses] = useState<Course[]>(() =>
    readStorage<Course[]>(STORAGE_KEYS.courses, [])
  );
  const [holidays, setHolidays] = useState<HolidayRange[]>(() =>
    readStorage<HolidayRange[]>(STORAGE_KEYS.holidays, [])
  );
  const [overrides, setOverrides] = useState<SessionOverride[]>(() =>
    readStorage<SessionOverride[]>(STORAGE_KEYS.overrides, [])
  );
  const [extras, setExtras] = useState<ExtraWork[]>(() =>
    readStorage<ExtraWork[]>(STORAGE_KEYS.extras, [])
  );
  const [settings, setSettings] = useState<SalarySettings>(() =>
    readStorage<SalarySettings>(STORAGE_KEYS.settings, defaultSettings)
  );

  const [courseModal, setCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [holidayModal, setHolidayModal] = useState(false);
  const [extraModal, setExtraModal] = useState<ExtraWorkType | null>(null);
  const [salaryModal, setSalaryModal] = useState(false);

  useEffect(() => writeStorage(STORAGE_KEYS.courses, courses), [courses]);
  useEffect(() => writeStorage(STORAGE_KEYS.holidays, holidays), [holidays]);
  useEffect(() => writeStorage(STORAGE_KEYS.overrides, overrides), [overrides]);
  useEffect(() => writeStorage(STORAGE_KEYS.extras, extras), [extras]);
  useEffect(() => writeStorage(STORAGE_KEYS.settings, settings), [settings]);

  const { sessions, skippedHolidays } = useMemo(
    () => generateAllSchedules(courses, holidays, overrides, settings),
    [courses, holidays, overrides, settings]
  );

  const monthSessions = sessions.filter((item) => item.date.startsWith(selectedMonth));
  const monthSkipped = skippedHolidays.filter((item) => item.date.startsWith(selectedMonth));
  const monthExtras = extras.filter((item) => dateFromDateTime(item.datetime).startsWith(selectedMonth));

  const expectedTeacher = monthSessions
    .filter((item) => isPaidStatus(item.status))
    .reduce((sum, item) => sum + item.amount, 0);

  const confirmedTeacher = monthSessions
    .filter((item) => item.status === 'confirmed')
    .reduce((sum, item) => sum + item.amount, 0);

  const cancelledTeacher = monthSessions
    .filter((item) => item.status === 'cancelled')
    .reduce((sum, item) => sum + getTeacherRateForDate(settings, item.date), 0);

  const expectedExtra = monthExtras.reduce((sum, item) => sum + getExtraAmount(item, settings), 0);

  const confirmedExtra = monthExtras
    .filter((item) => item.status === 'confirmed')
    .reduce((sum, item) => sum + getExtraAmount(item, settings), 0);

  const cancelledExtra = monthExtras
    .filter((item) => item.status === 'cancelled')
    .reduce((sum, item) => sum + getExtraRawAmount(item, settings), 0);

  const expectedIncome = expectedTeacher + expectedExtra;
  const confirmedIncome = confirmedTeacher + confirmedExtra;
  const cancelledIncome = cancelledTeacher + cancelledExtra;

  const waitingIncome = expectedIncome - confirmedIncome;

  const teacherBreakdown = expectedTeacher;
  const makeupBreakdown = monthExtras
    .filter((item) => item.type === 'makeup')
    .reduce((sum, item) => sum + getExtraAmount(item, settings), 0);
  const judgeBreakdown = monthExtras
    .filter((item) => item.type === 'judge')
    .reduce((sum, item) => sum + getExtraAmount(item, settings), 0);
  const trialBreakdown = monthExtras
    .filter((item) => item.type === 'trial')
    .reduce((sum, item) => sum + getExtraAmount(item, settings), 0);

  const upcomingItems = [
    ...monthSessions.map((item) => ({
      id: item.key,
      date: item.date,
      time: item.startTime,
      title: item.courseCode,
      subtitle: `${item.startTime} - ${item.endTime}`,
      status: item.status,
      type: 'class' as const,
    })),
    ...monthExtras.map((item) => ({
      id: item.id,
      date: dateFromDateTime(item.datetime),
      time: timeFromDateTime(item.datetime),
      title:
        item.type === 'trial'
          ? `Trial ${item.trialMode}`
          : item.type === 'judge'
            ? `Giám khảo · ${item.classCode}`
            : `Dạy bù · ${item.classCode}`,
      subtitle: `${formatDateTimeVN(item.datetime)}${item.type === 'trial' ? ` · ${item.studentCount || 0} HS` : ''}`,
      status: item.status,
      type: item.type,
    })),
  ]
    .filter((item) => item.status !== 'cancelled')
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

  const upcomingFuture = upcomingItems.filter((item) => item.date >= todayISO()).slice(0, 5);
  const pastThisMonth = upcomingItems.filter((item) => item.date < todayISO()).slice(-5).reverse();

  function openAddCourse() {
    setEditingCourse(null);
    setCourseModal(true);
  }

  function openEditCourse(course: Course) {
    setEditingCourse(course);
    setCourseModal(true);
  }

  function saveCourse(data: Omit<Course, 'id'>, id?: string) {
    if (id) {
      setCourses((prev) => prev.map((item) => (item.id === id ? { ...item, ...data } : item)));
    } else {
      setCourses((prev) => [{ id: uid(), ...data }, ...prev]);
    }

    setCourseModal(false);
    setEditingCourse(null);
  }

  function deleteCourse(id: string) {
    const ok = confirm('Xóa lớp này? Lịch sinh từ lớp cũng sẽ biến mất.');
    if (!ok) return;

    setCourses((prev) => prev.filter((item) => item.id !== id));
    setOverrides((prev) => prev.filter((item) => !item.key.startsWith(`${id}-`)));
    setHolidays((prev) =>
      prev.map((item) => (item.applyTo === id ? { ...item, applyTo: 'all' } : item))
    );
  }

  function addHoliday(data: Omit<HolidayRange, 'id'>) {
    setHolidays((prev) => [{ id: uid(), ...data }, ...prev]);
    setHolidayModal(false);
  }

  function deleteHoliday(id: string) {
    setHolidays((prev) => prev.filter((item) => item.id !== id));
  }

  function addExtra(data: Omit<ExtraWork, 'id'>) {
    setExtras((prev) => [{ id: uid(), ...data }, ...prev]);
    setExtraModal(null);
  }

  function updateExtraStatus(id: string, status: WorkStatus) {
    setExtras((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
  }

  function deleteExtra(id: string) {
    setExtras((prev) => prev.filter((item) => item.id !== id));
  }

  function updateSessionStatus(key: string, status: WorkStatus) {
    setOverrides((prev) => {
      const found = prev.find((item) => item.key === key);

      if (found) {
        return prev.map((item) => (item.key === key ? { ...item, status } : item));
      }

      return [...prev, { key, status }];
    });
  }

  function addSalaryRate(rate: number, effectiveDate: string) {
    setSettings((prev) => ({
      ...prev,
      salaryHistory: [
        ...prev.salaryHistory,
        {
          id: uid(),
          effectiveDate,
          teacherRatePerSession: rate,
        },
      ].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate)),
    }));

    setSalaryModal(false);
  }

  const currentTeacherRate = getTeacherRateForDate(settings, todayISO());

  return (
    <div className="min-h-screen bg-[#f5f8fc] text-slate-950">
      <div className="flex min-h-screen w-full">
        <aside className="hidden w-[264px] shrink-0 border-r border-slate-200 bg-white/95 p-5 xl:block">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
              <GraduationCap size={25} />
            </div>
            <div>
              <h1 className="text-xl font-black">Lịch Dạy</h1>
              <p className="text-sm font-semibold text-slate-500">Trung tâm lập trình</p>
            </div>
          </div>

          <nav className="space-y-2">
            <SideTab active={activeTab === 'overview'} icon={<Home size={20} />} label="Tổng quan" onClick={() => setActiveTab('overview')} />
            <SideTab active={activeTab === 'calendar'} icon={<CalendarDays size={20} />} label="Lịch tháng" onClick={() => setActiveTab('calendar')} />
            <SideTab active={activeTab === 'classes'} icon={<Wallet size={20} />} label="Lớp học của tôi" onClick={() => setActiveTab('classes')} />
            <SideTab active={activeTab === 'makeup'} icon={<Clock size={20} />} label="Dạy bù" onClick={() => setActiveTab('makeup')} />
            <SideTab active={activeTab === 'judge'} icon={<Users size={20} />} label="Ban giám khảo" onClick={() => setActiveTab('judge')} />
            <SideTab active={activeTab === 'trial'} icon={<Landmark size={20} />} label="Dạy trải nghiệm" badge="NEW" onClick={() => setActiveTab('trial')} />
            <SideTab active={activeTab === 'holidays'} icon={<CalendarDays size={20} />} label="Ngày nghỉ" onClick={() => setActiveTab('holidays')} />
            <SideTab active={activeTab === 'salary'} icon={<Coins size={20} />} label="Thống kê" onClick={() => setActiveTab('salary')} />
            <SideTab active={activeTab === 'settings'} icon={<Settings size={20} />} label="Cài đặt" onClick={() => setActiveTab('settings')} />
          </nav>

          <div className="mt-auto pt-10">
            <div className="rounded-3xl bg-blue-50 p-4">
              <p className="text-sm font-black text-blue-900">Mức lương GV</p>
              <p className="mt-2 text-2xl font-black text-blue-700">{money(currentTeacherRate)}</p>
              <p className="text-xs font-bold text-blue-700">/ ca 2 tiếng</p>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 p-4 lg:p-8">
          <header className="mb-7 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-3xl font-black">Tổng quan tháng {selectedMonth.slice(5)}/{selectedMonth.slice(0, 4)}</h2>
              <p className="mt-1 font-semibold text-slate-500">Theo dõi lịch dạy và thu nhập dự kiến</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <MonthSwitcher month={selectedMonth} setMonth={setSelectedMonth} />
              <button
                onClick={() => setSelectedMonth(currentMonthISO())}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-black text-slate-600 shadow-sm"
              >
                Hôm nay
              </button>
              <button
                onClick={() => setExtraModal('trial')}
                className="flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white shadow-lg shadow-blue-200"
              >
                <Plus size={19} />
                Book lịch
              </button>
              <IconButton><Bell size={20} /></IconButton>
              <IconButton><CircleHelp size={20} /></IconButton>
              <IconButton><Moon size={20} /></IconButton>
            </div>
          </header>

          <TopCards
            expectedIncome={expectedIncome}
            confirmedIncome={confirmedIncome}
            waitingIncome={waitingIncome}
            cancelledIncome={cancelledIncome}
          />

          <div className="mt-5 grid gap-5 2xl:grid-cols-[1fr_410px]">
            <section className="min-w-0">
              {(activeTab === 'overview' || activeTab === 'calendar') && (
                <CalendarBoard
                  selectedMonth={selectedMonth}
                  sessions={monthSessions}
                  skippedHolidays={monthSkipped}
                  extras={monthExtras}
                  settings={settings}
                  updateSessionStatus={updateSessionStatus}
                  updateExtraStatus={updateExtraStatus}
                  deleteExtra={deleteExtra}
                />
              )}

              {activeTab === 'classes' && (
                <ClassesPage
                  courses={courses}
                  sessions={sessions}
                  skippedHolidays={skippedHolidays}
                  openAddCourse={openAddCourse}
                  openEditCourse={openEditCourse}
                  deleteCourse={deleteCourse}
                />
              )}

              {activeTab === 'makeup' && (
                <ExtraListPage
                  title="Dạy bù"
                  type="makeup"
                  extras={monthExtras}
                  settings={settings}
                  openAdd={() => setExtraModal('makeup')}
                  updateExtraStatus={updateExtraStatus}
                  deleteExtra={deleteExtra}
                />
              )}

              {activeTab === 'judge' && (
                <ExtraListPage
                  title="Ban giám khảo"
                  type="judge"
                  extras={monthExtras}
                  settings={settings}
                  openAdd={() => setExtraModal('judge')}
                  updateExtraStatus={updateExtraStatus}
                  deleteExtra={deleteExtra}
                />
              )}

              {activeTab === 'trial' && (
                <ExtraListPage
                  title="Dạy trải nghiệm"
                  type="trial"
                  extras={monthExtras}
                  settings={settings}
                  openAdd={() => setExtraModal('trial')}
                  updateExtraStatus={updateExtraStatus}
                  deleteExtra={deleteExtra}
                />
              )}

              {activeTab === 'holidays' && (
                <HolidaysPage
                  holidays={holidays}
                  courses={courses}
                  openAdd={() => setHolidayModal(true)}
                  deleteHoliday={deleteHoliday}
                />
              )}

              {activeTab === 'salary' && (
                <SalaryPage
                  selectedMonth={selectedMonth}
                  sessions={monthSessions}
                  extras={monthExtras}
                  settings={settings}
                  expectedIncome={expectedIncome}
                  confirmedIncome={confirmedIncome}
                  cancelledIncome={cancelledIncome}
                  teacherBreakdown={teacherBreakdown}
                  makeupBreakdown={makeupBreakdown}
                  judgeBreakdown={judgeBreakdown}
                  trialBreakdown={trialBreakdown}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsPage
                  settings={settings}
                  currentTeacherRate={currentTeacherRate}
                  openSalary={() => setSalaryModal(true)}
                />
              )}

              <QuickBookPanel
                openAddCourse={openAddCourse}
                openMakeup={() => setExtraModal('makeup')}
                openJudge={() => setExtraModal('judge')}
                openTrial={() => setExtraModal('trial')}
                openHoliday={() => setHolidayModal(true)}
              />
            </section>

            <RightPanel
              expectedIncome={expectedIncome}
              teacherBreakdown={teacherBreakdown}
              makeupBreakdown={makeupBreakdown}
              judgeBreakdown={judgeBreakdown}
              trialBreakdown={trialBreakdown}
              upcomingFuture={upcomingFuture}
              pastThisMonth={pastThisMonth}
            />
          </div>
        </main>
      </div>

      <MobileTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      {courseModal && (
        <CourseModal
          course={editingCourse}
          currentRate={currentTeacherRate}
          onClose={() => {
            setCourseModal(false);
            setEditingCourse(null);
          }}
          onSave={saveCourse}
        />
      )}

      {holidayModal && (
        <HolidayModal
          courses={courses}
          onClose={() => setHolidayModal(false)}
          onSave={addHoliday}
        />
      )}

      {extraModal && (
        <ExtraWorkModal
          type={extraModal}
          settings={settings}
          onClose={() => setExtraModal(null)}
          onSave={addExtra}
        />
      )}

      {salaryModal && (
        <SalaryRateModal
          currentRate={currentTeacherRate}
          onClose={() => setSalaryModal(false)}
          onSave={addSalaryRate}
        />
      )}
    </div>
  );
}

function SideTab({
  active,
  icon,
  label,
  badge,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-bold transition',
        active
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
          : 'text-slate-600 hover:bg-slate-100'
      )}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] font-black text-white">
          {badge}
        </span>
      )}
    </button>
  );
}

function IconButton({ children }: { children: React.ReactNode }) {
  return (
    <button className="hidden rounded-2xl border border-slate-200 bg-white p-3 text-slate-600 shadow-sm lg:block">
      {children}
    </button>
  );
}

function TopCards({
  expectedIncome,
  confirmedIncome,
  waitingIncome,
  cancelledIncome,
}: {
  expectedIncome: number;
  confirmedIncome: number;
  waitingIncome: number;
  cancelledIncome: number;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard icon={<Wallet />} title="Thu nhập dự kiến" value={money(expectedIncome)} desc="Tổng thu nhập tháng" color="blue" />
      <MetricCard icon={<Save />} title="Đã xác nhận" value={money(confirmedIncome)} desc="Đã chắc chắn" color="green" />
      <MetricCard icon={<Clock />} title="Chờ xác nhận" value={money(waitingIncome)} desc="Dự kiến còn lại" color="orange" />
      <MetricCard icon={<X />} title="Hủy / Nghỉ" value={money(cancelledIncome)} desc="Khoản đã bị trừ" color="red" />
    </div>
  );
}

function MetricCard({
  icon,
  title,
  value,
  desc,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  desc: string;
  color: 'blue' | 'green' | 'orange' | 'red';
}) {
  const colorMap = {
    blue: 'from-blue-500 to-blue-600 shadow-blue-100',
    green: 'from-emerald-400 to-emerald-600 shadow-emerald-100',
    orange: 'from-orange-400 to-orange-500 shadow-orange-100',
    red: 'from-rose-400 to-rose-600 shadow-rose-100',
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className={clsx('flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg', colorMap[color])}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-bold text-slate-500">{title}</p>
          <p className="mt-1 text-2xl font-black">{value}</p>
          <p className="mt-1 text-xs font-semibold text-slate-400">{desc}</p>
        </div>
      </div>
    </div>
  );
}

function MonthSwitcher({
  month,
  setMonth,
}: {
  month: string;
  setMonth: (month: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setMonth(prevMonth(month))}
        className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-600 shadow-sm"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-black text-slate-700 shadow-sm"
      >
        {getMonthLabel(month)}
      </button>
      <button
        onClick={() => setMonth(nextMonth(month))}
        className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-600 shadow-sm"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}

function CalendarBoard({
  selectedMonth,
  sessions,
  skippedHolidays,
  extras,
  settings,
  updateSessionStatus,
  updateExtraStatus,
  deleteExtra,
}: {
  selectedMonth: string;
  sessions: GeneratedSession[];
  skippedHolidays: SkippedHoliday[];
  extras: ExtraWork[];
  settings: SalarySettings;
  updateSessionStatus: (key: string, status: WorkStatus) => void;
  updateExtraStatus: (id: string, status: WorkStatus) => void;
  deleteExtra: (id: string) => void;
}) {
  const days = getDaysInMonth(selectedMonth);
  const blankCount = getMondayIndex(days[0]);

  return (
    <div>
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-7 border-b border-slate-200">
          {weekdayLabels.map((item) => (
            <div key={item} className="p-5 text-center font-black text-slate-700">
              {item}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {Array.from({ length: blankCount }).map((_, index) => (
            <div key={`blank-${index}`} className="min-h-[118px] border-b border-r border-slate-100 bg-slate-50" />
          ))}

          {days.map((date) => {
            const daySessions = sessions.filter((item) => item.date === date);
            const daySkipped = skippedHolidays.filter((item) => item.date === date);
            const dayExtras = extras.filter((item) => dateFromDateTime(item.datetime) === date);
            const isToday = date === todayISO();

            return (
              <div
                key={date}
                className={clsx(
                  'min-h-[118px] border-b border-r border-slate-100 p-3',
                  isToday ? 'bg-blue-50' : 'bg-white',
                  daySkipped.length > 0 && 'bg-rose-50'
                )}
              >
                <div
                  className={clsx(
                    'mb-2 flex h-7 w-7 items-center justify-center rounded-full text-sm font-black',
                    isToday ? 'bg-blue-600 text-white' : 'text-slate-700'
                  )}
                >
                  {Number(date.slice(-2))}
                </div>

                <div className="space-y-1.5">
                  {daySessions.slice(0, 3).map((item) => (
                    <CalendarPill
                      key={item.key}
                      text={`${item.courseCode} · B${item.sessionNo}`}
                      sub={item.startTime}
                      status={item.status}
                      kind="class"
                    />
                  ))}

                  {daySkipped.slice(0, 1).map((item) => (
                    <CalendarPill key={item.id} text={item.title} status="cancelled" kind="holiday" />
                  ))}

                  {dayExtras.slice(0, 3).map((item) => (
                    <CalendarPill
                      key={item.id}
                      text={extraTitle(item)}
                      sub={timeFromDateTime(item.datetime)}
                      status={item.status}
                      kind={item.type}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-5 text-sm font-bold text-slate-500">
        <Legend color="bg-emerald-500" label="Lớp học" />
        <Legend color="bg-blue-500" label="Dạy bù" />
        <Legend color="bg-purple-500" label="Giám khảo" />
        <Legend color="bg-orange-500" label="Trial" />
        <Legend color="bg-rose-500" label="Ngày nghỉ" />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <div>
          <h3 className="mb-3 text-xl font-black">Buổi học trong tháng</h3>
          <div className="space-y-3">
            {sessions.map((item) => (
              <WorkRow
                key={item.key}
                title={`${item.courseCode} · Buổi ${item.sessionNo}`}
                subtitle={`${formatDateVN(item.date)} · ${item.startTime} - ${item.endTime}`}
                amount={isPaidStatus(item.status) ? money(item.amount) : 'Không tính'}
                status={item.status}
                onStatus={(status) => updateSessionStatus(item.key, status)}
              />
            ))}
            {sessions.length === 0 && <Empty text="Tháng này chưa có buổi học nào." />}
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-xl font-black">Lịch phụ trong tháng</h3>
          <div className="space-y-3">
            {extras.map((item) => (
              <WorkRow
                key={item.id}
                title={extraTitle(item)}
                subtitle={extraSubtitle(item)}
                amount={money(getExtraAmount(item, settings))}
                status={item.status}
                onStatus={(status) => updateExtraStatus(item.id, status)}
                onDelete={() => deleteExtra(item.id)}
              />
            ))}
            {extras.length === 0 && <Empty text="Chưa có dạy bù, giám khảo hoặc trial." />}
          </div>
        </div>
      </div>
    </div>
  );
}

function CalendarPill({
  text,
  sub,
  status,
  kind,
}: {
  text: string;
  sub?: string;
  status: WorkStatus;
  kind: ExtraWorkType | 'class' | 'holiday';
}) {
  const styles = {
    class: 'bg-emerald-50 text-emerald-800',
    makeup: 'bg-blue-50 text-blue-800',
    judge: 'bg-purple-50 text-purple-800',
    trial: 'bg-orange-50 text-orange-800',
    holiday: 'bg-rose-50 text-rose-800',
  };

  return (
    <div className={clsx('rounded-xl px-2.5 py-2 text-xs font-black', styles[kind], status === 'cancelled' && 'bg-rose-100 text-rose-800')}>
      <div className="truncate">{text}</div>
      {sub && <div className="mt-0.5 font-bold opacity-80">{sub}</div>}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={clsx('h-3 w-3 rounded-full', color)} />
      {label}
    </div>
  );
}

function QuickBookPanel({
  openAddCourse,
  openMakeup,
  openJudge,
  openTrial,
  openHoliday,
}: {
  openAddCourse: () => void;
  openMakeup: () => void;
  openJudge: () => void;
  openTrial: () => void;
  openHoliday: () => void;
}) {
  return (
    <div className="mt-6 rounded-3xl border border-blue-100 bg-blue-50/60 p-4">
      <div className="grid gap-3 md:grid-cols-5">
        <QuickBookButton icon={<Wallet />} label="Lớp học cố định" onClick={openAddCourse} />
        <QuickBookButton icon={<Clock />} label="Dạy bù" onClick={openMakeup} />
        <QuickBookButton icon={<Users />} label="Ban giám khảo" onClick={openJudge} />
        <QuickBookButton icon={<Landmark />} label="Dạy trải nghiệm" badge="NEW" onClick={openTrial} />
        <QuickBookButton icon={<Settings />} label="Ngày nghỉ" onClick={openHoliday} />
      </div>
    </div>
  );
}

function QuickBookButton({
  icon,
  label,
  badge,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl bg-white p-3 font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="text-blue-600">{icon}</div>
      {label}
      {badge && <span className="absolute right-3 top-3 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] text-white">{badge}</span>}
    </button>
  );
}

function RightPanel({
  expectedIncome,
  teacherBreakdown,
  makeupBreakdown,
  judgeBreakdown,
  trialBreakdown,
  upcomingFuture,
  pastThisMonth,
}: {
  expectedIncome: number;
  teacherBreakdown: number;
  makeupBreakdown: number;
  judgeBreakdown: number;
  trialBreakdown: number;
  upcomingFuture: any[];
  pastThisMonth: any[];
}) {
  return (
    <aside className="space-y-5">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-lg font-black">Phân bổ thu nhập dự kiến</h3>
        <div className="grid gap-3">
          <BreakdownLine color="bg-emerald-500" label="Lớp học" amount={teacherBreakdown} total={expectedIncome} />
          <BreakdownLine color="bg-blue-500" label="Dạy bù" amount={makeupBreakdown} total={expectedIncome} />
          <BreakdownLine color="bg-purple-500" label="Giám khảo" amount={judgeBreakdown} total={expectedIncome} />
          <BreakdownLine color="bg-orange-500" label="Trial" amount={trialBreakdown} total={expectedIncome} />
        </div>
        <button className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 font-black text-blue-700">
          <Download size={18} />
          Xem chi tiết thống kê
        </button>
      </div>

      <SmallScheduleCard title="Lịch sắp tới" items={upcomingFuture} />
      <SmallScheduleCard title="Lịch trong quá khứ tháng này" items={pastThisMonth} />

      <button className="flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-white px-4 py-4 font-black text-blue-700 shadow-sm">
        <Download size={18} />
        Xuất báo cáo tháng
      </button>
    </aside>
  );
}

function BreakdownLine({
  color,
  label,
  amount,
  total,
}: {
  color: string;
  label: string;
  amount: number;
  total: number;
}) {
  const percent = total ? Math.round((amount / total) * 1000) / 10 : 0;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm font-bold">
        <div className="flex items-center gap-2">
          <span className={clsx('h-3 w-3 rounded-full', color)} />
          {label}
        </div>
        <span>{money(amount)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={clsx('h-full rounded-full', color)} style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-1 text-xs font-bold text-slate-400">{percent}%</p>
    </div>
  );
}

function SmallScheduleCard({ title, items }: { title: string; items: any[] }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 p-5">
        <h3 className="font-black">{title}</h3>
        <button className="text-sm font-black text-blue-600">Xem tất cả</button>
      </div>
      <div className="space-y-1 p-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-2xl p-3 hover:bg-slate-50">
            <div>
              <p className="font-black">{item.title}</p>
              <p className="text-sm font-semibold text-slate-500">{item.subtitle}</p>
            </div>
            <span className={clsx('rounded-full px-3 py-1 text-xs font-black', item.status === 'confirmed' ? 'bg-slate-100 text-slate-600' : 'bg-orange-50 text-orange-700')}>
              {statusText(item.status)}
            </span>
          </div>
        ))}
        {items.length === 0 && <p className="p-4 text-center text-sm font-semibold text-slate-400">Chưa có lịch.</p>}
      </div>
    </div>
  );
}

function ClassesPage({
  courses,
  sessions,
  skippedHolidays,
  openAddCourse,
  openEditCourse,
  deleteCourse,
}: {
  courses: Course[];
  sessions: GeneratedSession[];
  skippedHolidays: SkippedHoliday[];
  openAddCourse: () => void;
  openEditCourse: (course: Course) => void;
  deleteCourse: (id: string) => void;
}) {
  return (
    <section>
      <PageHeader title="Lớp học của tôi" actionLabel="Thêm lớp" onAction={openAddCourse} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {courses.map((course) => {
          const courseSessions = sessions.filter((item) => item.courseId === course.id);
          const confirmed = courseSessions.filter((item) => item.status === 'confirmed').length;
          const planned = courseSessions.filter((item) => item.status === 'planned').length;
          const cancelled = courseSessions.filter((item) => item.status === 'cancelled').length;
          const skipped = skippedHolidays.filter((item) => item.courseId === course.id).length;

          return (
            <div key={course.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-3xl font-black text-blue-700">{course.code}</p>
                  <p className="mt-1 text-sm font-bold text-slate-500">
                    {weekdayLabels[nativeWeekdayToMondayIndex(course.weekday)]} · {course.startTime} - {addHoursToTime(course.startTime, 2)}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => openEditCourse(course)} className="rounded-full bg-slate-100 p-2 text-slate-600">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => deleteCourse(course.id)} className="rounded-full bg-red-50 p-2 text-red-600">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <p className="mt-3 text-sm font-semibold text-slate-500">
                Khai giảng: {formatDateVN(course.startDate)} · Tổng {course.totalSessions} buổi
              </p>

              <div className="mt-4 grid grid-cols-4 gap-2">
                <MiniStat label="Đã học" value={confirmed} />
                <MiniStat label="Dự kiến" value={planned} />
                <MiniStat label="Hủy" value={cancelled} />
                <MiniStat label="Nghỉ" value={skipped} />
              </div>
            </div>
          );
        })}
      </div>

      {courses.length === 0 && <Empty text="Chưa có lớp nào. Thêm lớp để bắt đầu sinh lịch 14 buổi." />}
    </section>
  );
}

function ExtraListPage({
  title,
  type,
  extras,
  settings,
  openAdd,
  updateExtraStatus,
  deleteExtra,
}: {
  title: string;
  type: ExtraWorkType;
  extras: ExtraWork[];
  settings: SalarySettings;
  openAdd: () => void;
  updateExtraStatus: (id: string, status: WorkStatus) => void;
  deleteExtra: (id: string) => void;
}) {
  const filtered = extras.filter((item) => item.type === type);

  return (
    <section>
      <PageHeader title={title} actionLabel="Book lịch" onAction={openAdd} />
      <div className="space-y-3">
        {filtered.map((item) => (
          <WorkRow
            key={item.id}
            title={extraTitle(item)}
            subtitle={extraSubtitle(item)}
            amount={money(getExtraAmount(item, settings))}
            status={item.status}
            onStatus={(status) => updateExtraStatus(item.id, status)}
            onDelete={() => deleteExtra(item.id)}
          />
        ))}
        {filtered.length === 0 && <Empty text={`Chưa có lịch ${title.toLowerCase()}.`} />}
      </div>
    </section>
  );
}

function HolidaysPage({
  holidays,
  courses,
  openAdd,
  deleteHoliday,
}: {
  holidays: HolidayRange[];
  courses: Course[];
  openAdd: () => void;
  deleteHoliday: (id: string) => void;
}) {
  return (
    <section>
      <PageHeader title="Ngày nghỉ" actionLabel="Thêm ngày nghỉ" onAction={openAdd} />
      <div className="space-y-3">
        {holidays.map((item) => {
          const course = courses.find((course) => course.id === item.applyTo);

          return (
            <div key={item.id} className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div>
                <p className="font-black">{item.title}</p>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {formatDateVN(item.startDate)} → {formatDateVN(item.endDate)} · {item.applyTo === 'all' ? 'Tất cả lớp' : course?.code || 'Một lớp'}
                </p>
              </div>
              <button onClick={() => deleteHoliday(item.id)} className="rounded-full bg-red-50 p-2 text-red-700">
                <Trash2 size={18} />
              </button>
            </div>
          );
        })}
        {holidays.length === 0 && <Empty text="Chưa có ngày nghỉ." />}
      </div>
    </section>
  );
}

function SalaryPage({
  sessions,
  extras,
  settings,
  expectedIncome,
  confirmedIncome,
  cancelledIncome,
  teacherBreakdown,
  makeupBreakdown,
  judgeBreakdown,
  trialBreakdown,
}: {
  selectedMonth: string;
  sessions: GeneratedSession[];
  extras: ExtraWork[];
  settings: SalarySettings;
  expectedIncome: number;
  confirmedIncome: number;
  cancelledIncome: number;
  teacherBreakdown: number;
  makeupBreakdown: number;
  judgeBreakdown: number;
  trialBreakdown: number;
}) {
  return (
    <section>
      <PageHeader title="Thống kê thu nhập" />
      <div className="grid gap-4 lg:grid-cols-4">
        <StatBox title="Lớp học" value={money(teacherBreakdown)} />
        <StatBox title="Dạy bù" value={money(makeupBreakdown)} />
        <StatBox title="Giám khảo" value={money(judgeBreakdown)} />
        <StatBox title="Trial" value={money(trialBreakdown)} />
      </div>

      <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-xl font-black">Tổng hợp</h3>
        <ReportLine label="Thu nhập dự kiến" value={money(expectedIncome)} strong />
        <ReportLine label="Đã xác nhận" value={money(confirmedIncome)} />
        <ReportLine label="Chờ xác nhận" value={money(expectedIncome - confirmedIncome)} />
        <ReportLine label="Nghỉ / hủy" value={money(cancelledIncome)} danger />
      </div>

      <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-xl font-black">Chi tiết</h3>
        <div className="space-y-3">
          {sessions.map((item) => (
            <DetailLine
              key={item.key}
              title={`${item.courseCode} · B${item.sessionNo}`}
              subtitle={`${formatDateVN(item.date)} · ${item.startTime}`}
              status={item.status}
              amount={item.status === 'cancelled' ? 'Không tính' : money(item.amount)}
            />
          ))}
          {extras.map((item) => (
            <DetailLine
              key={item.id}
              title={extraTitle(item)}
              subtitle={extraSubtitle(item)}
              status={item.status}
              amount={money(getExtraAmount(item, settings))}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function SettingsPage({
  settings,
  currentTeacherRate,
  openSalary,
}: {
  settings: SalarySettings;
  currentTeacherRate: number;
  openSalary: () => void;
}) {
  return (
    <section>
      <PageHeader title="Cài đặt" />

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="font-bold text-slate-500">Lương giáo viên hiện tại</p>
          <p className="mt-2 text-3xl font-black text-blue-700">{money(currentTeacherRate)}</p>
          <p className="mt-1 text-sm font-semibold text-slate-500">{money(currentTeacherRate / 2)} / giờ</p>

          <button onClick={openSalary} className="mt-4 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white">
            Cập nhật mức lương
          </button>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="font-bold text-slate-500">Quy tắc tính</p>
          <div className="mt-4 space-y-3">
            <ReportLine label="Dạy bù" value={`${settings.makeUpRatio * 100}% lương GV / giờ`} />
            <ReportLine label="Giám khảo" value={`${money(settings.judgeRatePerSession)} / lịch`} />
            <ReportLine label="Trial ONL" value={`${money(settings.trialOnlineRatePerStudent)} × số học sinh`} />
            <ReportLine label="Trial OFF" value={`${money(settings.trialOfflineBaseRate)} + ${money(settings.trialOfflineBonusPerStudent)} × số học sinh`} />
          </div>
        </div>
      </div>
    </section>
  );
}

function WorkRow({
  title,
  subtitle,
  amount,
  status,
  onStatus,
  onDelete,
}: {
  title: string;
  subtitle: string;
  amount: string;
  status: WorkStatus;
  onStatus: (status: WorkStatus) => void;
  onDelete?: () => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-black">{title}</p>
          <p className="mt-1 text-sm font-semibold text-slate-500">{subtitle}</p>
          <p className="mt-2 font-black text-blue-700">{amount}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <StatusButton active={status === 'planned'} label="Dự kiến" onClick={() => onStatus('planned')} />
          <StatusButton active={status === 'confirmed'} label="Xác nhận" onClick={() => onStatus('confirmed')} />
          <StatusButton active={status === 'cancelled'} label="Hủy" danger onClick={() => onStatus('cancelled')} />
          {onDelete && (
            <button onClick={onDelete} className="rounded-full bg-red-50 px-3 py-2 text-xs font-black text-red-700">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusButton({
  active,
  label,
  danger,
  onClick,
}: {
  active: boolean;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'rounded-full px-3 py-2 text-xs font-black',
        active && !danger && 'bg-blue-600 text-white',
        active && danger && 'bg-red-600 text-white',
        !active && 'bg-slate-100 text-slate-500'
      )}
    >
      {label}
    </button>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 text-center">
      <p className="text-xl font-black">{value}</p>
      <p className="mt-1 text-xs font-bold text-slate-500">{label}</p>
    </div>
  );
}

function StatBox({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="font-bold text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-black text-blue-700">{value}</p>
    </div>
  );
}

function ReportLine({
  label,
  value,
  strong,
  danger,
}: {
  label: string;
  value: string;
  strong?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3 last:border-0">
      <p className="font-bold text-slate-600">{label}</p>
      <p className={clsx('font-black', strong && 'text-2xl text-blue-700', danger && 'text-red-700')}>
        {value}
      </p>
    </div>
  );
}

function DetailLine({
  title,
  subtitle,
  status,
  amount,
}: {
  title: string;
  subtitle: string;
  status: WorkStatus;
  amount: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
      <div>
        <p className="font-black">{title}</p>
        <p className="text-sm font-semibold text-slate-500">{subtitle}</p>
      </div>
      <div className="text-right">
        <p className="font-black text-blue-700">{amount}</p>
        <p className="text-xs font-bold text-slate-400">{statusText(status)}</p>
      </div>
    </div>
  );
}

function PageHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-2xl font-black">{title}</h2>

      {actionLabel && onAction && (
        <button onClick={onAction} className="flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white">
          <Plus size={18} />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center font-semibold text-slate-500 shadow-sm">
      {text}
    </div>
  );
}

function MobileTabs({
  activeTab,
  setActiveTab,
}: {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}) {
  const items: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Tổng quan', icon: <Home size={20} /> },
    { key: 'calendar', label: 'Lịch', icon: <CalendarDays size={20} /> },
    { key: 'classes', label: 'Lớp', icon: <GraduationCap size={20} /> },
    { key: 'salary', label: 'Lương', icon: <Coins size={20} /> },
    { key: 'settings', label: 'Cài đặt', icon: <Settings size={20} /> },
  ];

  return (
    <div className="fixed bottom-3 left-3 right-3 z-40 rounded-3xl bg-white p-2 shadow-2xl xl:hidden">
      <div className="grid grid-cols-5 gap-1">
        {items.map((item) => (
          <button
            key={item.key}
            onClick={() => setActiveTab(item.key)}
            className={clsx(
              'flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-xs font-black',
              activeTab === item.key ? 'bg-blue-600 text-white' : 'text-slate-500'
            )}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ModalShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-3 md:items-center">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-[#f5f8fc] p-5 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-2xl font-black">{title}</h3>
          <button onClick={onClose} className="rounded-full bg-white p-2">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block font-black text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-blue-500"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-2 block font-black text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-blue-500"
      >
        {options.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function CourseModal({
  course,
  currentRate,
  onClose,
  onSave,
}: {
  course: Course | null;
  currentRate: number;
  onClose: () => void;
  onSave: (data: Omit<Course, 'id'>, id?: string) => void;
}) {
  const [code, setCode] = useState(course?.code || 'SA55');
  const [startDate, setStartDate] = useState(course?.startDate || todayISO());
  const [weekday, setWeekday] = useState(String(course?.weekday ?? getNativeWeekday(todayISO())));
  const [startTime, setStartTime] = useState(course?.startTime || '19:30');
  const [totalSessions, setTotalSessions] = useState(String(course?.totalSessions || 14));

  function submit() {
    onSave(
      {
        code: code.trim().toUpperCase(),
        startDate,
        weekday: Number(weekday),
        startTime,
        totalSessions: Number(totalSessions) || 14,
      },
      course?.id
    );
  }

  return (
    <ModalShell title={course ? 'Sửa lớp học' : 'Thêm lớp học'} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Tên / mã lớp" value={code} onChange={setCode} />
        <Field label="Ngày khai giảng" type="date" value={startDate} onChange={setStartDate} />

        <SelectField
          label="Thứ cố định"
          value={weekday}
          onChange={setWeekday}
          options={[
            { label: 'Thứ 2', value: '1' },
            { label: 'Thứ 3', value: '2' },
            { label: 'Thứ 4', value: '3' },
            { label: 'Thứ 5', value: '4' },
            { label: 'Thứ 6', value: '5' },
            { label: 'Thứ 7', value: '6' },
            { label: 'Chủ nhật', value: '0' },
          ]}
        />

        <Field label="Giờ bắt đầu" type="time" value={startTime} onChange={setStartTime} />
        <Field label="Số buổi" type="number" value={totalSessions} onChange={setTotalSessions} />

        <div className="rounded-3xl bg-blue-50 p-4 text-sm font-bold text-blue-800">
          Ca dạy mặc định 2 tiếng. App tự tính giờ kết thúc là {addHoursToTime(startTime, 2)}. Lương hiện tại: {money(currentRate)} / ca.
        </div>

        <button onClick={submit} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-4 font-black text-white">
          <Save size={18} />
          Lưu lớp học
        </button>
      </div>
    </ModalShell>
  );
}

function HolidayModal({
  courses,
  onClose,
  onSave,
}: {
  courses: Course[];
  onClose: () => void;
  onSave: (data: Omit<HolidayRange, 'id'>) => void;
}) {
  const [title, setTitle] = useState('Nghỉ lễ');
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [applyTo, setApplyTo] = useState('all');

  function submit() {
    onSave({
      title: title.trim() || 'Nghỉ',
      startDate,
      endDate: endDate < startDate ? startDate : endDate,
      applyTo,
    });
  }

  return (
    <ModalShell title="Thêm ngày nghỉ" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Tên ngày nghỉ" value={title} onChange={setTitle} />
        <Field label="Từ ngày" type="date" value={startDate} onChange={setStartDate} />
        <Field label="Đến ngày" type="date" value={endDate} onChange={setEndDate} />

        <SelectField
          label="Áp dụng cho"
          value={applyTo}
          onChange={setApplyTo}
          options={[
            { label: 'Tất cả lớp', value: 'all' },
            ...courses.map((course) => ({
              label: course.code,
              value: course.id,
            })),
          ]}
        />

        <button onClick={submit} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-4 font-black text-white">
          <Save size={18} />
          Lưu ngày nghỉ
        </button>
      </div>
    </ModalShell>
  );
}

function ExtraWorkModal({
  type,
  settings,
  onClose,
  onSave,
}: {
  type: ExtraWorkType;
  settings: SalarySettings;
  onClose: () => void;
  onSave: (data: Omit<ExtraWork, 'id'>) => void;
}) {
  const [classCode, setClassCode] = useState(type === 'trial' ? '' : type === 'makeup' ? 'SA55' : 'GA71');
  const [datetime, setDatetime] = useState(datetimeNowLocal());
  const [hours, setHours] = useState('1');
  const [students, setStudents] = useState('Nguyễn Minh Anh, Trần Gia Huy');
  const [studentCount, setStudentCount] = useState('1');
  const [trialMode, setTrialMode] = useState<'ONL' | 'OFF'>('ONL');
  const [campus, setCampus] = useState('Cơ sở Nguyễn Trãi');
  const [status, setStatus] = useState<WorkStatus>(getDefaultStatusByDate(todayISO()));
  const [note, setNote] = useState('');

  const parsedHours = Number(hours.replace(',', '.')) || 0;
  const parsedStudentCount = Number(studentCount) || 0;

  const preview: ExtraWork = {
    id: 'preview',
    type,
    classCode,
    datetime,
    hours: type === 'judge' ? 2 : parsedHours,
    students,
    studentCount: parsedStudentCount,
    trialMode,
    campus,
    status,
    note,
  };

  const estimate = getExtraAmount(preview, settings);

  function submit() {
    onSave({
      type,
      classCode: type === 'trial' ? undefined : classCode.trim().toUpperCase(),
      datetime,
      hours: type === 'judge' ? 2 : parsedHours,
      students: type === 'makeup' ? students : undefined,
      studentCount: type === 'trial' ? parsedStudentCount : undefined,
      trialMode: type === 'trial' ? trialMode : undefined,
      campus: type === 'trial' ? campus : undefined,
      status,
      note,
    });
  }

  const title =
    type === 'makeup'
      ? 'Book lịch dạy bù'
      : type === 'judge'
        ? 'Book lịch giám khảo'
        : 'Book lịch dạy trải nghiệm';

  return (
    <ModalShell title={title} onClose={onClose}>
      <div className="space-y-4">
        {type !== 'trial' && <Field label="Mã lớp" value={classCode} onChange={setClassCode} />}

        <Field
          label="Thời gian bắt đầu"
          type="datetime-local"
          value={datetime}
          onChange={(value) => {
            setDatetime(value);
            setStatus(getDefaultStatusByDate(dateFromDateTime(value)));
          }}
        />

        {type === 'makeup' && (
          <>
            <Field label="Số giờ dạy bù" type="number" value={hours} onChange={setHours} />
            <Field label="Tên học sinh" value={students} onChange={setStudents} placeholder="Viết chung nhiều tên vào đây" />
          </>
        )}

        {type === 'trial' && (
          <>
            <SelectField
              label="Hình thức trial"
              value={trialMode}
              onChange={(value) => setTrialMode(value as 'ONL' | 'OFF')}
              options={[
                { label: 'Online', value: 'ONL' },
                { label: 'Offline', value: 'OFF' },
              ]}
            />
            <Field label="Cơ sở đi dạy trial" value={campus} onChange={setCampus} />
            <Field label="Số học sinh" type="number" value={studentCount} onChange={setStudentCount} />
          </>
        )}

        {type === 'judge' && (
          <div className="rounded-3xl bg-purple-50 p-4 text-sm font-bold text-purple-800">
            Giám khảo mặc định 2 tiếng, lương cố định {money(settings.judgeRatePerSession)} / lịch.
          </div>
        )}

        <SelectField
          label="Trạng thái"
          value={status}
          onChange={(value) => setStatus(value as WorkStatus)}
          options={[
            { label: 'Dự kiến', value: 'planned' },
            { label: 'Đã xác nhận', value: 'confirmed' },
            { label: 'Hủy', value: 'cancelled' },
          ]}
        />

        <Field label="Ghi chú" value={note} onChange={setNote} />

        <div className="rounded-3xl bg-blue-50 p-4 text-sm font-bold text-blue-800">
          Lương tạm tính: {money(estimate)}
        </div>

        <button onClick={submit} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-4 font-black text-white">
          <Save size={18} />
          Lưu lịch
        </button>
      </div>
    </ModalShell>
  );
}

function SalaryRateModal({
  currentRate,
  onClose,
  onSave,
}: {
  currentRate: number;
  onClose: () => void;
  onSave: (rate: number, effectiveDate: string) => void;
}) {
  const [rate, setRate] = useState(String(currentRate));
  const [date, setDate] = useState(todayISO());

  function submit() {
    const parsed = Number(rate.replace(/[^\d]/g, ''));
    onSave(parsed, date);
  }

  return (
    <ModalShell title="Cập nhật mức lương" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Lương GV / ca 2 tiếng" type="number" value={rate} onChange={setRate} />
        <Field label="Áp dụng từ ngày" type="date" value={date} onChange={setDate} />

        <div className="rounded-3xl bg-blue-50 p-4 text-sm font-bold text-blue-800">
          Các buổi trước ngày áp dụng vẫn dùng mức cũ. Từ ngày này trở đi dùng mức mới.
        </div>

        <button onClick={submit} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-4 font-black text-white">
          <Save size={18} />
          Lưu mức lương
        </button>
      </div>
    </ModalShell>
  );
}

function extraTitle(item: ExtraWork) {
  if (item.type === 'makeup') return `Dạy bù · ${item.classCode}`;
  if (item.type === 'judge') return `Giám khảo · ${item.classCode}`;
  return `Trial ${item.trialMode} · ${item.studentCount || 0} HS`;
}

function extraSubtitle(item: ExtraWork) {
  if (item.type === 'trial') {
    return `${formatDateTimeVN(item.datetime)} · ${item.campus || 'Chưa có cơ sở'}`;
  }

  if (item.type === 'makeup') {
    return `${formatDateTimeVN(item.datetime)} · ${item.hours || 0} giờ · HS: ${item.students || 'Chưa ghi'}`;
  }

  return `${formatDateTimeVN(item.datetime)} · mặc định 2 tiếng`;
}