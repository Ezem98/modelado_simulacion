import "./App.css";

function App() {
  return (
    <div className="grid grid-rows-[auto_auto] h-[100vh] w-full">
      <header className="bg-yellow-500 h-fit">
        <nav>
          <ul className="flex justify-center gap-x-2">
            <li>Home</li>
            <li>Products</li>
            <li>Services</li>
            <li>About</li>
            <li>Contact</li>
          </ul>
        </nav>
      </header>
      <div className="grid grid-cols-[20%_auto] h-[100vh] w-full">
        <div className="bg-red-500 flex flex-1 items-center justify-center">
          <h1 className="text-white text-2xl font-bold">Panel Izquierdo</h1>
        </div>
        <div className="items-center justify-center grid grid-rows-2">
          <div className="text-white text-2xl font-bold bg-blue-500 flex flex-1 items-center justify-center">
            Panel Derecho
          </div>
          <div className="text-white text-2xl font-bold bg-green-500 flex flex-1 items-center justify-center">
            Panel Derecho
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
