import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Quotes from './pages/Quotes';
import Backup from './pages/Backup';
import Settings from './pages/Settings';
import AuthCallback from './pages/AuthCallback';
import Projects from './pages/Projects';
import Folders from './pages/Folders';
import Decisions from './pages/Decisions';
import ClientPortal from './pages/ClientPortal';
import Access from './pages/Access';
import Planner from './pages/Planner';
import Reports from './pages/Reports';
import Exports from './pages/Exports';
import Automations from './pages/Automations';
import Documents from './pages/Documents';
import Invoices from './pages/Invoices';
import TimerShowcase from './pages/TimerShowcase';
import GreenInvoice from './pages/GreenInvoice';
import TimeLogs from './pages/TimeLogs';
import Register from './pages/Register';
import UserApprovals from './pages/UserApprovals';
import Meetings from './pages/Meetings';
import SpreadsheetDetails from './pages/SpreadsheetDetails';
import Tasks from './pages/Tasks';
import DailyReports from './pages/DailyReports';
import SmartAI from './pages/SmartAI';
import Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Clients": Clients,
    "Quotes": Quotes,
    "Backup": Backup,
    "Settings": Settings,
    "AuthCallback": AuthCallback,
    "Projects": Projects,
    "Folders": Folders,
    "Decisions": Decisions,
    "ClientPortal": ClientPortal,
    "Access": Access,
    "Planner": Planner,
    "Reports": Reports,
    "Exports": Exports,
    "Automations": Automations,
    "Documents": Documents,
    "Invoices": Invoices,
    "TimerShowcase": TimerShowcase,
    "GreenInvoice": GreenInvoice,
    "TimeLogs": TimeLogs,
    "Register": Register,
    "UserApprovals": UserApprovals,
    "Meetings": Meetings,
    "SpreadsheetDetails": SpreadsheetDetails,
    "Tasks": Tasks,
    "DailyReports": DailyReports,
    "SmartAI": SmartAI,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};