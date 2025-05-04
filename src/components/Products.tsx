import productsData from "../../products.json";
import "../assets/css/products/products.css";

import tech710Logo from "../assets/icons/tech710.png";

export function Products({ searchTerm = "" }) {
  const allProducts = Object.values(productsData).flat();

interface ProductsInfo {
  title: string;
  price: string;
  link: string;
  image?: string; // the ? indicates that it's optional info
}
  const filterProducts = (products: ProductsInfo[]) => {
    if (!products || !Array.isArray(products)) {
      console.log("No products array found:", products);
      return [];
    }
    return products.filter(
      (product) =>
        product.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.price?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  if (!allProducts) {
    return <div>Loading products...</div>;
  }

  const filteredProducts = filterProducts(allProducts);

  return (
    <div className="products-container">
      <h1 className="products-title">Productos</h1>
      <section className="product-section">
        <h2 className="store-title">Products</h2>
        <div className="products-grid">
          {filteredProducts.map((product, index) => (
            <div className="product-card" key={index}>
              <div className="product-image-container">
                <img
                  src={product.image}
                  alt={product.title}
                  className="product-image"
                  width="200"
                  height="auto"
                />
                <img
                  className="company-logo"
                  src={tech710Logo}
                  alt="Tech710 logo"
                />
              </div>
              <p className="product-from-company">
                Producto de la mano: {product.title || ""}{" "}
              </p>
              {product.link && (
                <a
                  href={product.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <h2 className="product-title">{product.title}</h2>
                </a>
              )}
              {product.price && (
                <h4 className="product-price">{product.price}</h4>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
