// "use client";

// import { useEffect, useState } from "react";
// import { createPortal } from "react-dom";

// export default function LogoOverlay() {
//   const [mounted, setMounted] = useState(false);

//   useEffect(() => {
//     setMounted(true);
//   }, []);

//   if (!mounted) return null;

//   return createPortal(
//     <a href="/">
//       <img
//         src="/logo.png"
//         alt="Logo"
//         style={{
//           position: "fixed",
//           top: "-10px",
//           left: "0px",
//           width: "100px",
//           height: "100px",
//           objectFit: "contain",
//           zIndex: 9999,
//           cursor: "pointer",
//         }}
//       />
//     </a>,
//     document.body
//   );
// }