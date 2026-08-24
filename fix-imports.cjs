const fs = require('fs');
let code = fs.readFileSync('src/components/layout.tsx', 'utf-8');

// Remove from react-router-dom
code = code.replace("import { CalendarClock, Link, useLocation } from 'react-router-dom';", "import { Link, useLocation } from 'react-router-dom';");

// Add to lucide-react if not there
if (!code.includes("CalendarClock")) {
  code = code.replace("import { \n  BarChart3,", "import { \n  CalendarClock,\n  BarChart3,");
} else {
  // It's already in the file somewhere, let's just make sure it's in lucide-react
  code = code.replace("import { \n  BarChart3,", "import { \n  CalendarClock,\n  BarChart3,");
}

fs.writeFileSync('src/components/layout.tsx', code);
