import { Route, Routes } from "react-router-dom";

import IndexPage from "@/pages/index";
import BinarySearchPage from "@/pages/numericMethods/binarySearch";
import LagrangePage from "./pages/functionRebuilding/lagrange";
import FixedPointPage from "./pages/numericMethods/fixedPoint";
import NewtonRaphsonPage from "./pages/numericMethods/newtonRaphson";

function App() {
  return (
    <Routes>
      <Route element={<IndexPage />} path="/" />
      <Route
        element={<BinarySearchPage />}
        path="/numericMethods/binarySearch"
      />
      <Route element={<FixedPointPage />} path="/numericMethods/fixedPoint" />
      <Route
        element={<NewtonRaphsonPage />}
        path="/numericMethods/newtonRaphson"
      />
      <Route element={<LagrangePage />} path="/functionRebuilding/lagrange" />
    </Routes>
  );
}

export default App;
