import { Switch, Route, Redirect } from "wouter";
import SimpleLogin from "@/pages/simple-login";
import SimpleDashboard from "@/pages/simple-dashboard";

// App totalmente simplificado para resolver problemas de autenticação
function App() {
  return (
    <Switch>
      {/* Rotas simplificadas sem dependências complexas */}
      <Route path="/simple-login" component={SimpleLogin} />
      <Route path="/simple-dashboard" component={SimpleDashboard} />
      
      {/* Redirecionar para login simplificado */}
      <Route path="/">
        <Redirect to="/simple-login" />
      </Route>
      
      {/* Redirecionar qualquer outra rota para login */}
      <Route path="/:rest*">
        <Redirect to="/simple-login" />
      </Route>
    </Switch>
  );
}

export default App;
