import AppProviders from './context/AppProviders'
import { HashRouter, Routes, Route } from 'react-router-dom';
import Test from './Test'
import Test2 from './Test2'

function App() {

  return (
    <AppProviders>
      <HashRouter>
        <Routes>
          <Route>
            <Route path="/" element={<Test />} />
          </Route>
          <Route>
            <Route index path="/task" element={<Test2 />} />
          </Route>
        </Routes>
      </HashRouter>
    </AppProviders>
  )
}

export default App