import re

with open('src/pages/dashboard.tsx', 'r') as f:
    c = f.read()

c = c.replace("""import { useGlobalData } from '@/contexts/GlobalDataContext';""", """import { useGlobalData } from '@/contexts/GlobalDataContext';\nimport { UsageSection } from '@/components/UsageSection';""")

c = c.replace("""    </div>
  );
}""", """    <div className="mt-8">
        <UsageSection />
      </div>
    </div>
  );
}""")

with open('src/pages/dashboard.tsx', 'w') as f:
    f.write(c)

