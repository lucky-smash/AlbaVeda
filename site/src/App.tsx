import { lazy, Suspense, useState } from "react";
import { createBrowserRouter, Navigate, Outlet, RouterProvider, ScrollRestoration, useParams } from "react-router-dom";
import { CartDrawer } from "./components/CartDrawer";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { SearchSheet } from "./components/SearchSheet";
import { categories, findVariant } from "./data/catalog";
import { CartProvider } from "./lib/cart";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import Shop from "./pages/Shop";

// Home and shop listings ship in the main bundle; secondary pages load on demand.
const ProductPage = lazy(() => import("./pages/Product"));
const About = lazy(() => import("./pages/About"));
const Brands = lazy(() => import("./pages/Brands"));
const Contact = lazy(() => import("./pages/Contact"));
const Policy = lazy(() => import("./pages/Policy"));
const Checkout = lazy(() => import("./pages/Checkout"));

function Layout() {
  const [searchOpen, setSearchOpen] = useState(false);
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Header onSearch={() => setSearchOpen(true)} />
      <main id="main" tabIndex={-1}>
        <Suspense fallback={<div className="page-loading" aria-busy="true" />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <CartDrawer />
      <SearchSheet open={searchOpen} onClose={() => setSearchOpen(false)} />
      <ScrollRestoration />
    </>
  );
}

/** Old Wix product URLs (/product-page/<slug>) resolve to the matching product. */
function LegacyProduct() {
  const { slug = "" } = useParams();
  const hit = findVariant(slug);
  const size = hit && hit.product.variants.length > 1 ? `?size=${encodeURIComponent(hit.variant.id)}` : "";
  return <Navigate to={hit ? `/product/${hit.product.id}${size}` : "/shop"} replace />;
}

const legacy: [string, string][] = [
  ["about-us", "/about"],
  ["ourbrands", "/brands"],
  ["saar", "/brands#saar"],
  ["shop-1", "/shop"],
  ["shop-2", "/shop"],
  ["about-4", "/policies/privacy"],
  ["about-4-1", "/policies/terms"],
  ["about-4-2", "/policies/refunds"],
  ["copy-of-return-cancellation-policy", "/policies/shipping"],
];

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: "shop", element: <Shop /> },
      ...categories.map((c) => ({ path: c.id, element: <Shop key={c.id} category={c.id} /> })),
      { path: "product/:id", element: <ProductPage /> },
      { path: "product-page/:slug", element: <LegacyProduct /> },
      { path: "about", element: <About /> },
      { path: "brands", element: <Brands /> },
      { path: "contact", element: <Contact /> },
      { path: "policies/:id", element: <Policy /> },
      { path: "checkout", element: <Checkout /> },
      ...legacy.map(([from, to]) => ({ path: from, element: <Navigate to={to} replace /> })),
      { path: "*", element: <NotFound /> },
    ],
  },
]);

export default function App() {
  return (
    <CartProvider>
      <RouterProvider router={router} />
    </CartProvider>
  );
}
