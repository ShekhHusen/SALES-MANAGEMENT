const fs = require('fs');
let code = fs.readFileSync('src/pages/follow-ups.tsx', 'utf-8');

const regex = /<DialogTrigger render=\{\s*<Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900\/30" onClick=\{\(\) => setSelectedEntityForHistory\(\{ id: item\.entityId, type: item\.entityType, saleId: item\.saleId \}\)\}>\s*<Plus className="h-4 w-4" \/>\s*<\/Button>\s*\} \/>/g;

const replacement = `<DialogTrigger asChild>
                               <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30" onClick={() => setSelectedEntityForHistory({ id: item.entityId, type: item.entityType, saleId: item.saleId })}>
                                 <Plus className="h-4 w-4" />
                               </Button>
                             </DialogTrigger>`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/pages/follow-ups.tsx', code);
