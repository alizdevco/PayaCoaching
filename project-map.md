# نقشه پروژه — edu-consult

> فقط فایل‌های `src/` — فایل‌های تست، config و فایل‌های زیر ۱۰ خط حذف شده‌اند.

**آمار کلی:** ~۹۰ فایل مستند | **ساده:** ۳۳ | **متوسط:** ۳۶ | **پیچیده:** ۲۱

---

## src (ورودی اپ)

- **main.jsx** — نقطه ورود React: mount، Router، AuthProvider و QueryClientProvider | مفاهیم: `createRoot`, `StrictMode`, `BrowserRouter`, Context Providers | پیچیدگی: ساده
- **App.jsx** — تعریف تمام routeها با lazy loading، layoutهای admin/student و ProtectedRoute | مفاهیم: `lazy`, `Suspense`, `Routes`/`Route`, `useLocation`, `useEffect`, Error Boundary | پیچیدگی: پیچیده

---

## src/pages

- **AdminDashboardPage.jsx** — داشبورد ادمین با آمار کلی (دانش‌آموزان، گزارش‌ها، آزمون‌ها) و دسترسی سریع | مفاهیم: `useState`, `useEffect`, `useQuery`, `useNavigate`, `requestAnimationFrame`, custom hook | پیچیدگی: متوسط
- **CompleteProfilePage.jsx** — فرم تکمیل پروفایل برای دانش‌آموزانی که پس از ورود پروفایل ناقص دارند | مفاهیم: `useState`, `useEffect`, `useForm`, `useNavigate`, `Navigate`, `useAuth`, `useMutation` | پیچیدگی: متوسط
- **ExamAnalysisPage.jsx** — صفحه عمومی نمایش تحلیل آزمون منتشرشده بر اساس تاریخ در URL | مفاهیم: `useEffect`, `useParams`, `Link`, custom hook (`useExamAnalysis`), loading/error states | پیچیدگی: متوسط
- **ExamManagementPage.jsx** — پنل ادمین برای CRUD تحلیل آزمون‌ها، انتشار/لغو انتشار و آپلود/حذف فایل | مفاهیم: `useState`, `useEffect`, `useMemo`, `useRef`, `useForm`, `Controller`, `useWarnOnLeave`, multiple `useMutation`, Modal | پیچیدگی: پیچیده
- **LandingPage.jsx** — صفحه لندینگ با Hero و بارگذاری تنبل بخش‌های پایین صفحه | مفاهیم: `lazy`, `Suspense`, custom hook (`useBelowFoldGate`), code splitting | پیچیدگی: ساده
- **LoginPage.jsx** — ورود (موبایل/ایمیل + رمز) و ویزارد بازیابی رمز با OTP در سه مرحله | مفاهیم: `useState`, `useEffect`, `useRef`, `useCallback`, `useForm`, `useMutation`, sessionStorage, `setInterval`, multi-step wizard | پیچیدگی: پیچیده
- **NotFoundPage.jsx** — صفحه خطای ۴۰۴ با لینک بازگشت به صفحه اصلی | مفاهیم: `Link`, presentational component | پیچیدگی: ساده
- **OnlineExamManagementPage.jsx** — مدیریت آزمون آنلاین: ایجاد/ویرایش، کلید پاسخ ۱۵۰ سوالی، آپلود PDF و تخصیص دانش‌آموزان | مفاهیم: `useState`, `useEffect`, `useMemo`, `useRef`, `useForm`, `Controller`, `watch`, `useWarnOnLeave`, `Set`, multiple hooks/mutations, Modal | پیچیدگی: پیچیده
- **OnlineExamResultsPage.jsx** — نمایش نتایج آزمون آنلاین برای ادمین: لیست تلاش‌ها با نمره و درصد | مفاهیم: `useParams`, `Link`, custom hooks, loading/error states, table rendering, refetch | پیچیدگی: متوسط
- **RegisterPage.jsx** — ثبت‌نام سه‌مرحله‌ای: موبایل → OTP → تکمیل پروفایل و رمز | مفاهیم: `useState`, `useEffect`, `useRef`, `useCallback`, `useForm`, `useMutation`, popstate/history, OTP cooldown, multi-step wizard | پیچیدگی: پیچیده
- **StudentDetailsPage.jsx** — جزئیات دانش‌آموز برای ادمین: تب‌های گزارش، مشاوره، محتوا، آزمون + ویرایش پروفایل | مفاهیم: `useState`, `useEffect`, `useMemo`, `useParams`, `useForm`, tab navigation, Modal, `useWarnOnLeave`, many hooks/mutations | پیچیدگی: پیچیده
- **StudentOnlineExamsPage.jsx** — لیست آزمون‌های آنلاین اختصاص‌یافته به دانش‌آموز با وضعیت و لینک ورود/ادامه | مفاهیم: `Link`, custom hook (`useStudentOnlineExamList`), refetchInterval, loading/error/empty states | پیچیدگی: متوسط
- **StudentsPage.jsx** — لیست و مدیریت دانش‌آموزان با جستجو، فیلتر، صفحه‌بندی و حذف | مفاهیم: `useState`, `useMemo`, `useNavigate`, `useQuery`, `useMutation`, Modal, client-side filtering/pagination | پیچیدگی: متوسط
- **StudentTakeExamPage.jsx** — شرکت در آزمون آنلاین: دانلود PDF، تایمر، پاسخنامه، ذخیره خودکار و ثبت نهایی | مفاهیم: `useState`, `useEffect`, `useRef`, `useCallback`, `memo`, custom hooks, `useMutation`, `setInterval`, beforeunload, Modal | پیچیدگی: پیچیده

---

## src/pages/student

- **StudentExamDetailPage.jsx** — نمایش جزئیات یک تحلیل آزمون منتشرشده برای دانش‌آموز | مفاهیم: `useEffect`, `useParams`, `Link`, custom hook (`useExamAnalysis`), `ExamAnalysisView` | پیچیدگی: متوسط
- **StudentExamsPage.jsx** — فهرست تحلیل‌های آزمون منتشرشده برای دانش‌آموز به‌صورت کارت | مفاهیم: `Link`, custom hook (`useExamList`), loading/error/empty states | پیچیدگی: ساده
- **StudentProfilePage.jsx** — مشاهده و ویرایش پروفایل شخصی دانش‌آموز در پنل کاربری | مفاهیم: `useState`, `useEffect`, `useForm`, `useAuth`, `useMutation`, `watch`, dirtyFields | پیچیدگی: متوسط
- **StudentReportsPage.jsx** — نمایش گزارش‌های کار (PDF) و تاریخچه مشاوره‌های تلفنی دانش‌آموز | مفاهیم: `useState`, `useMemo`, custom hooks, async download, `window.open` | پیچیدگی: متوسط
- **StudentSharedContentPage.jsx** — لیست محتوای اختصاصی (ویدیو، PDF، تصویر، لینک) با فیلتر نوع | مفاهیم: `useState`, `useEffect`, `useMemo`, custom hooks, filter UI, URL validation | پیچیدگی: متوسط

---

## src/components

- **AdminLayout.jsx** — چیدمان پنل ادمین با سایدبار، منوی موبایل، دارک‌مود و خروج | مفاهیم: `useState`, `useEffect`, `useRef`, `Outlet`, `NavLink`, `useNavigate`, localStorage | پیچیدگی: پیچیده
- **BackToTopButton.jsx** — دکمه شناور بازگشت به بالا با نمایش/مخفی‌سازی بر اساس اسکرول | مفاهیم: `useState`, `useEffect`, `createPortal`, IntersectionObserver | پیچیدگی: متوسط
- **Button.jsx** — دکمه قابل‌استفاده‌مجدد با variant، size و حالت loading | مفاهیم: functional component, props destructuring, conditional rendering | پیچیدگی: ساده
- **Card.jsx** — کارت عمومی با prop `as` برای تغییر تگ HTML | مفاهیم: polymorphic component, spread props | پیچیدگی: ساده
- **ChunkErrorBoundary.jsx** — Error Boundary برای خطاهای lazy-load/chunk و پیشنهاد reload | مفاهیم: class component, `getDerivedStateFromError`, `componentDidCatch` | پیچیدگی: متوسط
- **ErrorState.jsx** — نمایش پیام خطا با دکمه «تلاش مجدد» اختیاری | مفاهیم: functional component, conditional rendering, composition | پیچیدگی: ساده
- **JalaliDateInput.jsx** — ورودی تاریخ شمسی با ذخیره ISO میلادی | مفاهیم: controlled input, `useState`, `useEffect`, sync state با props | پیچیدگی: متوسط
- **LandingFooter.jsx** — فوتر لندینگ با لوگو، کپی‌رایت و لینک‌ها | مفاهیم: sub-component, `Link`, static data | پیچیدگی: ساده
- **LoadingState.jsx** — اسپینر بارگذاری با پیام قابل‌تنظیم | مفاهیم: functional component, `role="status"`, conditional layout | پیچیدگی: ساده
- **Modal.jsx** — مودال با backdrop، Escape، قفل scroll و footer | مفاهیم: `useEffect`, early return, ARIA, sub-component | پیچیدگی: متوسط
- **Navbar.jsx** — نوار ناوبری لندینگ با منوی کاربر، drawer موبایل و auth | مفاهیم: `useState`, `useEffect`, `useRef`, `useAuth`, dynamic import, scroll listeners | پیچیدگی: پیچیده
- **StudentLayout.jsx** — چیدمان پنل دانش‌آموز با سایدبار، دارک‌مود و نام پروفایل | مفاهیم: `useAuth`, React Router layout, refs, indicator animation, async logout | پیچیدگی: پیچیده
- **StudentProfileFields.jsx** — فیلدهای مشترک پروفایل (ثبت‌نام/ادمین) با اعتبارسنجی | مفاهیم: react-hook-form (`register`, `Controller`, `watch`, `setValue`), conditional validation | پیچیدگی: پیچیده

---

## src/components/landing

- **AboutSection.jsx** — بخش «چرا پایا کوچینگ؟» با متن معرفی و badgeها | مفاهیم: static arrays, `.map()`, responsive grid | پیچیدگی: ساده
- **ContactSection.jsx** — بخش تماس با تلفن و تلگرام | مفاهیم: data-driven rendering, external links, utility import | پیچیدگی: ساده
- **CtaSection.jsx** — بخش دعوت به اقدام (CTA) برای ثبت‌نام | مفاهیم: presentational component, `Link` | پیچیدگی: ساده
- **ExamAnalysisSection.jsx** — نمایش تحلیل آزمون‌ها در لندینگ با pagination و prefetch | مفاهیم: `useQueryClient`, `prefetchQuery`, custom hooks, `useIntersectionMount`, `useState` | پیچیدگی: پیچیده
- **FeaturesSection.jsx** — کارت‌های ویژگی‌های سرویس (مشاوره، محتوا، تحلیل، پشتیبانی) | مفاهیم: icon components, static config array, list rendering | پیچیدگی: ساده
- **HeroSection.jsx** — Hero لندینگ با عنوان، CTA و پس‌زمینه موج | مفاهیم: composition, anchor + router links | پیچیدگی: ساده
- **HeroWaveBackground.jsx** — پس‌زمینه SVG انیمیشن‌دار موج برای Hero | مفاهیم: `useMemo`, `useSyncExternalStore`, media query subscription, SVG manipulation | پیچیدگی: پیچیده

---

## src/components/auth

- **AuthPageLayout.jsx** — قالب صفحات login/register با header و کارت مرکزی | مفاهیم: layout component, named export, conditional subtitle | پیچیدگی: ساده
- **RegisterStepIndicator.jsx** — نشانگر مراحل ثبت‌نام (۳ مرحله) | مفاهیم: sub-components, `Fragment`, ARIA step indicator | پیچیدگی: متوسط

---

## src/hooks

- **useBelowFoldGate.js** — به‌تأخیر انداختن بارگذاری بخش‌های پایین صفحه لندینگ تا اسکرول، idle یا hash | مفاهیم: custom hook, `useState`, `useCallback`, `useEffect`, `IntersectionObserver`, `requestIdleCallback` | پیچیدگی: متوسط
- **useIntersectionMount.js** — وقتی عنصر ref وارد viewport شود، `isMounted` را true می‌کند (lazy mount) | مفاهیم: custom hook, `useRef`, `useState`, `useEffect`, `IntersectionObserver` | پیچیدگی: ساده
- **useWarnOnLeave.js** — هنگام آپلود فعال، خروج از صفحه را با `beforeunload` و `useBlocker` هشدار می‌دهد | مفاهیم: custom hook, `useEffect`, `useBlocker`, `beforeunload` | پیچیدگی: متوسط

---

## src/routes

- **ProtectedRoute.jsx** — Route guard برای احراز هویت، نقش (admin/student) و تکمیل پروفایل | مفاهیم: `Navigate`, `useAuth`, conditional rendering | پیچیدگی: متوسط

---

## src/context

> Contextها در این پروژه داخل `features/auth/` قرار دارند.

- **features/auth/AuthContext.jsx** — Provider سراسری session و profile با bootstrap تأخیری و prefetch مسیرهای student | مفاهیم: Context Provider, `useState`, `useEffect`, `useRef`, `useCallback`, lazy import, React Query prefetch | پیچیدگی: پیچیده
- **features/auth/useAuth.js** — Hook خواندن session، profile و role از AuthContext | مفاهیم: custom hook, `useContext`, error guard | پیچیدگی: ساده

---

## src/api

> لایه API در `features/*/` و `lib/` پراکنده است — توابع async خالص بدون React.

- **features/auth/authApi.js** — API احراز هویت Supabase: ورود، OTP، پروفایل، ثبت‌نام و بازیابی رمز | مفاهیم: async/await, Supabase Auth, fetch, RPC | پیچیدگی: پیچیده
- **features/content/contentApi.js** — CRUD محتوای دانش‌آموز: آپلود فایل/لینک، محتوای مشترک، URL دانلود و حذف | مفاهیم: Supabase, XHR upload با progress, Edge Functions | پیچیدگی: پیچیده
- **features/consultations/consultationsApi.js** — CRUD جلسات مشاوره دانش‌آموز در Supabase | مفاهیم: Supabase insert/select/delete, date/time builder | پیچیدگی: متوسط
- **features/dashboard/dashboardApi.js** — دریافت آمار داشبورد: تعداد دانش‌آموز، گزارش و آزمون منتشرشده | مفاهیم: `Promise.all`, Supabase count queries | پیچیدگی: ساده
- **features/exams/examsApi.js** — API تحلیل آزمون: CRUD، publish، آپلود/حذف PDF و ویدیو | مفاهیم: Supabase nested select, XHR upload, validation helpers | پیچیدگی: پیچیده
- **features/online-exams/onlineExamsApi.js** — API آزمون آنلاین: CRUD، تخصیص، attempt، finalize و PDF | مفاهیم: Supabase RPC, validation, status computation, Map | پیچیدگی: پیچیده
- **features/students/studentsApi.js** — API لیست، جزئیات، ویرایش و حذف پروفایل دانش‌آموز | مفاهیم: Supabase, Edge Function, payload builder | پیچیدگی: متوسط
- **lib/edgeFunctions.js** — نقطه واحد فراخوانی Supabase Edge Functions با مدیریت خطا، refresh توکن و پیام‌های فارسی | مفاهیم: async/await, error handling, retry logic, Supabase client | پیچیدگی: پیچیده
- **lib/storageUpload.js** — آپلود فایل به Arvan Storage با PUT تکی یا multipart، retry، progress و stall detection | مفاهیم: XMLHttpRequest, Promise, concurrency control, exponential backoff | پیچیدگی: پیچیده

---

## src/lib

- **loadExtendedFonts.js** — بارگذاری تنبل فونت‌های Vazirmatn (Medium/Bold) پس از first paint | مفاهیم: dynamic `import()`, `requestIdleCallback`, module-level caching | پیچیدگی: ساده
- **persianDate.js** — تبدیل تاریخ جلالی/میلادی، فرمت فارسی و parse تاریخ برای ذخیره ISO | مفاهیم: calendar algorithms, `Intl.DateTimeFormat`, regex | پیچیدگی: پیچیده
- **queryClient.js** — پیکربندی پیش‌فرض React Query با `staleTime` و `gcTime` | مفاهیم: TanStack Query `QueryClient`, configuration object | پیچیدگی: ساده

---

## src/utils

- **scrollToSection.js** — اسکرول به section با id، با پشتیبانی از عناصر lazy و navigation با hash | مفاهیم: DOM API, `MutationObserver`, `scrollIntoView`, `history.pushState` | پیچیدگی: متوسط
- **urlValidation.js** — اعتبارسنجی URL خارجی فقط برای پروتکل‌های http/https | مفاهیم: `URL` constructor, try/catch | پیچیدگی: ساده

---

## src/features/auth

- **authMutationErrors.js** — تبدیل خطاهای auth/profile به پیام‌های امن و کاربرپسند فارسی | مفاهیم: error classification, switch | پیچیدگی: متوسط
- **authRoutes.js** — مسیر redirect پس از ورود بر اساس role و وضعیت تکمیل پروفایل | مفاهیم: pure functions, conditional routing logic | پیچیدگی: متوسط
- **iranLocations.js** — داده استان‌ها و شهرهای ایران برای فرم پروفایل | مفاهیم: JSON import, `Object.fromEntries`, pure functions | پیچیدگی: متوسط
- **otpCooldown.js** — مدیریت cooldown ۱۲۰ ثانیه‌ای ارسال OTP در localStorage | مفاهیم: localStorage, Map, Date math | پیچیدگی: متوسط
- **phoneValidation.js** — اعتبارسنجی شماره موبایل ایرانی و تبدیل به فرمت E.164 | مفاهیم: pure functions, regex | پیچیدگی: پیچیده
- **sessionHint.js** — تشخیص نیاز به bootstrap احراز هویت از localStorage بدون بارگذاری Supabase | مفاهیم: localStorage, `import.meta.env`, pure functions | پیچیدگی: متوسط
- **useCompleteProfile.js** — Mutation تکمیل/به‌روزرسانی پروفایل دانش‌آموز | مفاهیم: `useMutation` | پیچیدگی: ساده
- **useForgotPassword.js** — Mutationهای ارسال OTP بازیابی رمز و تنظیم رمز جدید | مفاهیم: `useMutation` | پیچیدگی: ساده
- **useLogin.js** — Mutation ورود با phone/email و دریافت role از profiles | مفاهیم: `useMutation`, async mutationFn | پیچیدگی: ساده
- **useRegister.js** — Mutationهای ثبت‌نام سه‌مرحله‌ای: OTP، verify، ثبت پروفایل | مفاهیم: `useMutation`, `useQueryClient`, `invalidateQueries` | پیچیدگی: متوسط

---

## src/features/content

- **SharedContentPage.jsx** — صفحه ادمین آپلود محتوای مشترک (فایل یا لینک) برای همه دانش‌آموزان | مفاهیم: `useState`, controlled form, custom hook, `useWarnOnLeave` | پیچیدگی: متوسط
- **useAddLink.js** — Mutation افزودن لینک به محتوای یک دانش‌آموز | مفاهیم: `useMutation`, query invalidation | پیچیدگی: ساده
- **useDeleteContent.js** — Mutation حذف محتوا و invalidate کش | مفاهیم: `useMutation`, `useQueryClient` | پیچیدگی: ساده
- **useUploadContent.js** — Mutation آپلود فایل برای یک دانش‌آموز با progress | مفاهیم: `useMutation`, onProgress callback | پیچیدگی: ساده
- **useUploadSharedContent.js** — Mutation آپلود/لینک مشترک برای همه دانش‌آموزان | مفاهیم: `useMutation`, conditional mutationFn | پیچیدگی: ساده

---

## src/features/exams

- **ExamAnalysisView.jsx** — نمای عمومی تحلیل آزمون با TOC، scroll spy، ویدیو و PDF | مفاهیم: `useMemo`, `useEffect`, IntersectionObserver, `Link`, sub-components | پیچیدگی: پیچیده
- **useExamFileMutations.js** — Mutation آپلود و حذف فایل‌های تحلیل آزمون | مفاهیم: `useMutation`, query invalidation | پیچیدگی: متوسط
- **useExamList.js** — Query لیست آزمون‌ها با queryOptions قابل prefetch | مفاهیم: `useQuery`, queryKey factory | پیچیدگی: ساده
- **useExamMutations.js** — Mutationهای create/update/publish/unpublish/delete آزمون | مفاهیم: `useMutation`, shared invalidation helper | پیچیدگی: متوسط

---

## src/features/online-exams

- **onlineExamScheduling.js** — محاسبه state زمانی آزمون (باز/در جریان/پایان) و برچسب‌های UI | مفاهیم: constants, Date math, pure functions | پیچیدگی: متوسط
- **useOnlineExamAutoSave.js** — Hook ذخیره خودکار پاسخ‌های آزمون با debounce و interval | مفاهیم: custom hook, `useRef`, `useEffect`, `useCallback`, `useState`, debounce, `setQueryData` | پیچیدگی: پیچیده
- **useOnlineExamList.js** — Queryهای لیست آزمون، attempt و assignment برای admin و student | مفاهیم: `useQuery`, refetchInterval option | پیچیدگی: متوسط
- **useOnlineExamMutations.js** — Mutationهای مدیریت آزمون آنلاین، PDF، attempt و assignment | مفاهیم: `useMutation`, `setQueryData`, granular invalidation | پیچیدگی: متوسط

---

## src/features/consultations

- **useAddConsultation.js** — Mutation ثبت جلسه مشاوره جدید | مفاهیم: `useMutation`, `useQueryClient` | پیچیدگی: ساده
- **useDeleteConsultation.js** — Mutation حذف جلسه مشاوره | مفاهیم: `useMutation`, query invalidation | پیچیدگی: ساده

---

## src/features/students

- **useStudentProfile.js** — Query پروفایل + mutation ویرایش/حذف با navigate | مفاهیم: `useQuery`, `useMutation`, `useQueryClient`, `useNavigate` | پیچیدگی: متوسط
- **useStudents.js** — Query لیست دانش‌آموزان با staleTime | مفاهیم: `useQuery`, staleTime config | پیچیدگی: ساده

---

## فایل‌های حذف‌شده (زیر ۱۰ خط)

| فایل | دلیل |
|------|------|
| `features/auth/authContext.js` | فقط `createContext` (۴ خط) |
| `features/auth/profileOptions.js` | ثابت‌های GRADES و ACADEMIC_MAJORS (۴ خط) |
| `features/content/useOwnStudentContent.js` | wrapper ساده روی `useStudentContent` (۷ خط) |
| `features/consultations/useOwnConsultations.js` | wrapper ساده روی `useConsultations` (۷ خط) |
| `components/ScrollToTop.jsx` | اسکرول به بالا هنگام تغییر route (۹ خط) |
| `components/auth/authFormStyles.js` | ثابت‌های CSS class (۹ خط) |
| `features/consultations/useConsultations.js` | wrapper `useQuery` (۹ خط) |
| `features/content/useContentSignedUrl.js` | wrapper `useQuery` (۹ خط) |
| `features/content/useStudentContent.js` | wrapper `useQuery` (۹ خط) |
| `features/exams/useExamAnalysis.js` | wrapper `useQuery` (۹ خط) |
| `features/online-exams/useOnlineExamAttempt.js` | wrapper `useQuery` (۹ خط) |
| `lib/supabase.js` | ساخت کلاینت Supabase (۹ خط) |

---

## الگوهای معماری

```
Pages/Components  →  Custom Hooks (useQuery/useMutation)  →  *Api.js  →  Supabase / Edge Functions / Storage
                              ↓
                        AuthContext (session + profile)
```

| لایه | مسیر | نقش |
|------|------|-----|
| **UI** | `pages/`, `components/` | رندر، state محلی، فرم‌ها |
| **Hooks** | `hooks/`, `features/*/use*.js` | data fetching، mutations، side effects |
| **Context** | `features/auth/` | session و profile سراسری |
| **API** | `features/*/*Api.js`, `lib/` | توابع async خالص |
| **Utils** | `utils/`, `lib/persianDate.js` | منطق بدون React |

---

## پیچیده‌ترین فایل‌ها

1. `pages/StudentDetailsPage.jsx` — چند تب، فرم‌ها، آپلود، mutations متعدد
2. `pages/OnlineExamManagementPage.jsx` — کلید پاسخ ۱۵۰ سوالی، تخصیص دانش‌آموز
3. `pages/ExamManagementPage.jsx` — CRUD آزمون + آپلود فایل
4. `pages/LoginPage.jsx` — ویزارد OTP و بازیابی رمز
5. `pages/StudentTakeExamPage.jsx` — تایمر، autosave، پاسخنامه
6. `features/online-exams/onlineExamsApi.js` — RPC، attempt، finalize
7. `features/auth/AuthContext.jsx` — bootstrap session، prefetch
8. `lib/storageUpload.js` — multipart upload + retry
