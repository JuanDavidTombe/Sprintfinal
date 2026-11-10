import React from 'react';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowDownToLine,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpCircle,
  Banknote,
  BarChart3,
  Bell,
  BookMarked,
  Boxes,
  Building2,
  Calculator,
  Calendar,
  Camera,
  Check,
  CheckCheck,
  CheckCircle2,
  CheckSquare,
  ChefHat,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ClipboardCheck,
  ClipboardList,
  Clock,
  CloudDownload,
  Coins,
  Cpu,
  Download,
  Edit3,
  FileSpreadsheet,
  FileText,
  Filter,
  Flame,
  FolderKanban,
  Gauge,
  History,
  Hourglass,
  Inbox,
  Info,
  KeyRound,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  List,
  ListChecks,
  Landmark,
  Lock,
  LogIn,
  MapPin,
  Maximize2,
  Moon,
  Navigation,
  Package,
  PackageCheck,
  PackageOpen,
  Phone,
  Pin,
  Plus,
  PlusCircle,
  Power,
  Printer,
  QrCode,
  Receipt,
  RefreshCw,
  RotateCcw,
  Save,
  ScanBarcode,
  ScanLine,
  Scale,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  ShieldLock,
  ShieldOff,
  SlidersHorizontal,
  Snowflake,
  Sparkles,
  Sun,
  Table2,
  ThermometerSnowflake,
  Trash2,
  TrendingUp,
  Truck,
  User,
  UserCheck,
  UserPlus,
  Users,
  Utensils,
  Volume2,
  Wallet,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  IconCubeSend,
  IconPackages,
  IconSnowflake,
  IconTemperatureMinus,
  IconTruckDelivery,
  IconBuildingFactory2,
  IconScaleOutline,
  IconReceiptTax,
  IconQrcode,
  IconCertificate,
} from '@tabler/icons-react';

const ICON_MAP = {
  speedometer2: Gauge,
  'grid-1x2-fill': LayoutDashboard,
  activity: Activity,
  list: List,
  'list-task': ListChecks,
  table: Table2,
  inbox: Inbox,

  'box-seam': IconPackages,
  'box-seam-fill': Package,
  boxes: Boxes,
  'box-arrow-in-down': ArrowDownToLine,
  'box-arrow-in-right': LogIn,
  snow: IconSnowflake,
  snow2: Snowflake,
  'thermometer-half': ThermometerSnowflake,
  'qr-code': IconQrcode,
  'qr-code-scan': ScanLine,
  'upc-scan': ScanBarcode,
  'layers-half': Layers,
  scale: IconScaleOutline,

  'egg-fried': ChefHat,
  fire: Flame,
  gear: Settings,
  printer: Printer,
  'printer-fill': Printer,
  'check2-square': CheckSquare,
  'check2-circle': CheckCircle2,
  'check-circle-fill': CheckCircle2,
  'check2-all': CheckCheck,
  check2: Check,
  'check-lg': Check,
  calculator: Calculator,
  'calculator-fill': Calculator,
  trash3: Trash2,
  'clipboard-data': ClipboardList,
  'clipboard2-check': ClipboardCheck,

  truck: IconTruckDelivery,
  'truck-flatbed': Truck,
  'geo-alt': MapPin,
  'geo-alt-fill': MapPin,
  'signpost-2': Navigation,
  'pin-angle': Pin,

  'cash-coin': Coins,
  'cash-stack': Banknote,
  wallet2: Wallet,
  bank: Landmark,
  bank2: Landmark,
  'graph-up-arrow': TrendingUp,
  'bar-chart-line': BarChart3,
  'file-earmark-excel': FileSpreadsheet,
  'file-earmark-spreadsheet-fill': FileSpreadsheet,
  'file-earmark-text': FileText,
  'journal-text': FileText,
  'journal-bookmark': BookMarked,
  receipt: IconReceiptTax,
  download: Download,
  'cloud-arrow-down': CloudDownload,

  people: Users,
  person: User,
  'person-plus': UserPlus,
  'person-exclamation': ShieldAlert,
  'person-fill-exclamation': ShieldAlert,
  'shield-check': ShieldCheck,
  'shield-exclamation': ShieldAlert,
  'shield-lock': ShieldLock,
  'shield-lock-fill': ShieldLock,
  'shield-slash-fill': ShieldOff,
  'lock-fill': Lock,
  key: KeyRound,
  sliders: SlidersHorizontal,
  building: IconBuildingFactory2,
  buildings: Building2,
  'hdd-network': Cpu,

  'exclamation-octagon': AlertOctagon,
  'exclamation-octagon-fill': AlertOctagon,
  'exclamation-triangle': AlertTriangle,
  'exclamation-triangle-fill': AlertTriangle,
  'info-circle-fill': Info,
  'hourglass-split': Hourglass,
  'slash-circle': XCircle,
  'x-circle-fill': XCircle,
  'x-lg': X,
  'lightning-charge-fill': Zap,

  search: Search,
  'funnel-fill': Filter,
  'plus-lg': Plus,
  'plus-circle': PlusCircle,
  pencil: Edit3,
  'pencil-square': Edit3,
  floppy: Save,
  'floppy-fill': Save,
  save2: Save,
  'arrow-clockwise': RefreshCw,
  'arrow-repeat': RefreshCw,
  'arrow-counterclockwise': RotateCcw,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  'arrow-left-right': ArrowLeftRight,
  'arrow-up-circle-fill': ArrowUpCircle,
  'arrows-fullscreen': Maximize2,
  'caret-right-fill': ChevronRight,
  'chevron-right': ChevronRight,
  'chevron-down': ChevronDown,
  'chevron-up': ChevronUp,
  clock: Clock,
  'clock-history': History,
  calendar3: Calendar,
  camera: Camera,
  phone: Phone,
  envelope: FileText,
  bell: Bell,
  'volume-up': Volume2,
  sun: Sun,
  'moon-stars': Moon,
  power: Power,
};

export default function AppIcon({
  name,
  size = 16,
  strokeWidth = 1.85,
  className = '',
  ...rest
}) {
  const cleanName = String(name || '')
    .replace(/^bi\s+bi-/, '')
    .replace(/^bi-/, '')
    .trim();

  const IconComponent = ICON_MAP[cleanName] || Package;

  return (
    <IconComponent
      size={size}
      strokeWidth={strokeWidth}
      className={`inline-block shrink-0 ${className}`}
      aria-hidden="true"
      {...rest}
    />
  );
}

export function MicroMasterLogo({ size = 40, className = '' }) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-xl bg-slate-950 border border-lime-400/40 flex items-center justify-center shrink-0 shadow-xs relative overflow-hidden ${className}`}
    >
      <svg
        width={Math.round(size * 0.64)}
        height={Math.round(size * 0.64)}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M12 2.25L20.25 7V17L12 21.75L3.75 17V7L12 2.25Z"
          stroke="#CCFF00"
          strokeWidth="1.85"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 21.75V12M12 12L20.25 7M12 12L3.75 7"
          stroke="#CCFF00"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity="0.85"
        />
        <path
          d="M7.8 4.65L16.1 9.4"
          stroke="#38BDF8"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="12" cy="12" r="2.1" fill="#CCFF00" />
      </svg>
    </div>
  );
}
