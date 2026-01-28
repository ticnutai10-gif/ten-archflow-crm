/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
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
import DataTypes from './pages/DataTypes';
import Decisions from './pages/Decisions';
import Documentation from './pages/Documentation';
import DocumentationExport from './pages/DocumentationExport';
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
import ProjectAnalytics from './pages/ProjectAnalytics';
import ProjectDetails from './pages/ProjectDetails';
import Projects from './pages/Projects';
import Quotes from './pages/Quotes';
import Register from './pages/Register';
import RemoveDuplicates from './pages/RemoveDuplicates';
import Reports from './pages/Reports';
import SalaryReports from './pages/SalaryReports';
import Settings from './pages/Settings';
import SpreadsheetDetails from './pages/SpreadsheetDetails';
import Tasks from './pages/Tasks';
import TimeLogs from './pages/TimeLogs';
import TimerShowcase from './pages/TimerShowcase';
import UserApprovals from './pages/UserApprovals';
import WorkflowBuilder from './pages/WorkflowBuilder';
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
    "DataTypes": DataTypes,
    "Decisions": Decisions,
    "Documentation": Documentation,
    "DocumentationExport": DocumentationExport,
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
    "ProjectAnalytics": ProjectAnalytics,
    "ProjectDetails": ProjectDetails,
    "Projects": Projects,
    "Quotes": Quotes,
    "Register": Register,
    "RemoveDuplicates": RemoveDuplicates,
    "Reports": Reports,
    "SalaryReports": SalaryReports,
    "Settings": Settings,
    "SpreadsheetDetails": SpreadsheetDetails,
    "Tasks": Tasks,
    "TimeLogs": TimeLogs,
    "TimerShowcase": TimerShowcase,
    "UserApprovals": UserApprovals,
    "WorkflowBuilder": WorkflowBuilder,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};