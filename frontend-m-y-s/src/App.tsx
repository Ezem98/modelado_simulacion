import { Route, Routes } from "react-router-dom";

import AboutPage from "@/pages/about";
import BlogPage from "@/pages/blog";
import IndexPage from "@/pages/index";
import BinarySearchPage from "@/pages/numericMethods/binarySearch";
import FixedPointPage from "./pages/numericMethods/fixedPoint";

function App() {
  return (
    <Routes>
      <Route element={<IndexPage />} path="/" />
      <Route
        element={<BinarySearchPage />}
        path="/numericMethods/binarySearch"
      />
      <Route element={<FixedPointPage />} path="/numericMethods/fixedPoint" />
      <Route element={<BlogPage />} path="/blog" />
      <Route element={<AboutPage />} path="/about" />
    </Routes>
  );
}

export default App;
