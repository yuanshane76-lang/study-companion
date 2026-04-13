import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Subjects from './pages/Subjects'
import SubjectDetail from './pages/SubjectDetail'
import ReportDetail from './pages/ReportDetail'
import NewPlan from './pages/NewPlan'
import EditPlan from './pages/EditPlan'
import Settings from './pages/Settings'
import WeeklyReport from './pages/WeeklyReport'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/subjects" element={<Subjects />} />
        <Route path="/subjects/:id" element={<SubjectDetail />} />
        <Route path="/reports/:id" element={<ReportDetail />} />
        <Route path="/plans/new" element={<NewPlan />} />
        <Route path="/plans/:id/edit" element={<EditPlan />} />
        <Route path="/subjects/:subjectId/weekly" element={<WeeklyReport />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  )
}

export default App
