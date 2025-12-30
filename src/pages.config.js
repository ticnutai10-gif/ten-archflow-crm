import AIChat from './pages/AIChat';
import Access from './pages/Access';
import AuthCallback from './pages/AuthCallback';
import Automations from './pages/Automations';
import Backup from './pages/Backup';
import ChatHistory from './pages/ChatHistory';
import ClientAutomations from './pages/ClientAutomations';
import ClientPortal from './pages/ClientPortal';
import Clients from './pages/Clients';
import CommunicationHub from './pages/CommunicationHub';
import CustomSpreadsheets from './pages/CustomSpreadsheets';
import DailyReports from './pages/DailyReports';
import Dashboard from './pages/Dashboard';
import Decisions from './pages/Decisions';
import Documents from './pages/Documents';
import Exports from './pages/Exports';
import Folders from './pages/Folders';
import GreenInvoice from './pages/GreenInvoice';
import Home from './pages/Home';
import Integrations from './pages/Integrations';
import InternalChat from './pages/InternalChat';
import Invoices from './pages/Invoices';
import Meetings from './pages/Meetings';
import Planner from './pages/Planner';
import ProjectDetails from './pages/ProjectDetails';
import Projects from './pages/Projects';
import Quotes from './pages/Quotes';
import Register from './pages/Register';
import RemoveDuplicates from './pages/RemoveDuplicates';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import SpreadsheetDetails from './pages/SpreadsheetDetails';
import Tasks from './pages/Tasks';
import TimeLogs from './pages/TimeLogs';
import TimerShowcase from './pages/TimerShowcase';
import UserApprovals from './pages/UserApprovals';
import WorkflowBuilder from './pages/WorkflowBuilder';
import DataTypes from './pages/DataTypes';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AIChat": AIChat,
    "Access": Access,
    "AuthCallback": AuthCallback,
    "Automations": Automations,
    "Backup": Backup,
    "ChatHistory": ChatHistory,
    "ClientAutomations": ClientAutomations,
    "ClientPortal": ClientPortal,
    "Clients": Clients,
    "CommunicationHub": CommunicationHub,
    "CustomSpreadsheets": CustomSpreadsheets,
    "DailyReports": DailyReports,
    "Dashboard": Dashboard,
    "Decisions": Decisions,
    "Documents": Documents,
    "Exports": Exports,
    "Folders": Folders,
    "GreenInvoice": GreenInvoice,
    "Home": Home,
    "Integrations": Integrations,
    "InternalChat": InternalChat,
    "Invoices": Invoices,
    "Meetings": Meetings,
    "Planner": Planner,
    "ProjectDetails": ProjectDetails,
    "Projects": Projects,
    "Quotes": Quotes,
    "Register": Register,
    "RemoveDuplicates": RemoveDuplicates,
    "Reports": Reports,
    "Settings": Settings,
    "SpreadsheetDetails": SpreadsheetDetails,
    "Tasks": Tasks,
    "TimeLogs": TimeLogs,
    "TimerShowcase": TimerShowcase,
    "UserApprovals": UserApprovals,
    "WorkflowBuilder": WorkflowBuilder,
    "DataTypes": DataTypes,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};