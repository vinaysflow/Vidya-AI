import { useTranslation } from 'react-i18next';
import {
  BookOpen, Beaker, Calculator, Leaf, Code2, BookMarked,
  TrendingUp, PenLine, Heart, Sparkles, BrainCircuit
} from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  useChatStore,
  SUBJECT_META,
  CATEGORY_LABELS,
  type Subject,
  type SubjectCategory,
} from '../../stores/chatStore';

interface WelcomeScreenProps {
  onStarterClick: (text: string) => void;
}

const SUBJECT_ICONS: Record<Subject, typeof BookOpen> = {
  PHYSICS: BookOpen,
  CHEMISTRY: Beaker,
  MATHEMATICS: Calculator,
  BIOLOGY: Leaf,
  CODING: Code2,
  AI_LEARNING: BrainCircuit,
  ENGLISH_LITERATURE: BookMarked,
  ECONOMICS: TrendingUp,
  ESSAY_WRITING: PenLine,
  COUNSELING: Heart,
};

const STARTER_PROMPTS: Partial<Record<Subject, Record<string, string[]>>> = {
  PHYSICS: {
    EN: ["A ball is thrown upward at 20 m/s. Find the maximum height.", "Explain the difference between distance and displacement."],
    HI: ["एक गेंद को 20 m/s से ऊपर फेंका गया। अधिकतम ऊंचाई ज्ञात करें।", "दूरी और विस्थापन में क्या अंतर है?"],
    FR: ["Une balle est lancee vers le haut a 20 m/s. Trouvez la hauteur maximale.", "Expliquez la difference entre distance et deplacement."],
    DE: ["Ein Ball wird mit 20 m/s nach oben geworfen. Finde die maximale Hoehe.", "Erklaere den Unterschied zwischen Strecke und Verschiebung."],
    ES: ["Una pelota se lanza hacia arriba a 20 m/s. Halla la altura maxima.", "Explica la diferencia entre distancia y desplazamiento."],
    ZH: ["一个球以 20 m/s 的速度向上抛出，求最大高度。", "解释距离和位移的区别。"],
  },
  CHEMISTRY: {
    EN: ["How do you calculate the molarity of a solution?", "What's the difference between ionic and covalent bonding?"],
    HI: ["किसी solution की molarity कैसे calculate करते हैं?", "Ionic और covalent bonding में क्या अंतर है?"],
    FR: ["Comment calcule-t-on la molarite d'une solution ?", "Quelle est la difference entre une liaison ionique et covalente ?"],
    DE: ["Wie berechnet man die Molaritaet einer Loesung?", "Was ist der Unterschied zwischen ionischer und kovalenter Bindung?"],
    ES: ["Como se calcula la molaridad de una solucion?", "Cual es la diferencia entre enlace ionico y covalente?"],
    ZH: ["如何计算溶液的摩尔浓度？", "离子键和共价键有什么区别？"],
  },
  MATHEMATICS: {
    EN: ["How do I solve a quadratic equation by factoring?", "What is the derivative of x^2 * sin(x)?"],
    HI: ["Quadratic equation को factoring से कैसे solve करते हैं?", "x^2 * sin(x) का derivative क्या होगा?"],
    FR: ["Comment resoudre une equation quadratique par factorisation ?", "Quelle est la derivee de x^2 * sin(x) ?"],
    DE: ["Wie loest man eine quadratische Gleichung durch Faktorisieren?", "Was ist die Ableitung von x^2 * sin(x)?"],
    ES: ["Como resolver una ecuacion cuadratica por factorizacion?", "Cual es la derivada de x^2 * sin(x)?"],
    ZH: ["如何用因式分解法解二次方程？", "x^2 * sin(x) 的导数是什么？"],
  },
  BIOLOGY: {
    EN: ["What is the difference between mitosis and meiosis?", "How does the human respiratory system exchange gases?"],
    HI: ["Mitosis और meiosis में क्या अंतर है?", "मानव respiratory system में gas exchange कैसे होता है?"],
    FR: ["Quelle est la difference entre mitose et meiose ?", "Comment le systeme respiratoire humain echange-t-il les gaz ?"],
    DE: ["Was ist der Unterschied zwischen Mitose und Meiose?", "Wie funktioniert der Gasaustausch im menschlichen Atmungssystem?"],
    ES: ["Cual es la diferencia entre mitosis y meiosis?", "Como intercambia gases el sistema respiratorio humano?"],
    ZH: ["有丝分裂和减数分裂有什么区别？", "人体呼吸系统如何进行气体交换？"],
  },
  CODING: {
    EN: ["Find two numbers in an array that add up to a target sum.", "What's the difference between a stack and a queue?"],
    HI: ["Array में दो numbers खोजें जिनका sum target के बराबर हो।", "Stack और Queue में क्या अंतर है?"],
    FR: ["Trouvez deux nombres dans un tableau dont la somme est egale a une cible.", "Quelle est la difference entre une pile et une file ?"],
    DE: ["Finde zwei Zahlen in einem Array, deren Summe gleich einem Zielwert ist.", "Was ist der Unterschied zwischen Stack und Queue?"],
    ES: ["Encuentra dos numeros en un arreglo que sumen un valor objetivo.", "Cual es la diferencia entre una pila y una cola?"],
    ZH: ["在数组中找到两个和为目标值的数字。", "栈和队列有什么区别？"],
  },
  ENGLISH_LITERATURE: {
    EN: ["What does the green light symbolize in The Great Gatsby?", "How does the author use irony in this passage?"],
    HI: ["The Great Gatsby में green light का क्या प्रतीक है?", "लेखक इस passage में irony का उपयोग कैसे करते हैं?"],
    FR: ["Que symbolise la lumiere verte dans Gatsby le Magnifique ?", "Comment l'auteur utilise-t-il l'ironie dans ce passage ?"],
    DE: ["Was symbolisiert das gruene Licht in Der grosse Gatsby?", "Wie verwendet der Autor Ironie in dieser Passage?"],
    ES: ["Que simboliza la luz verde en El Gran Gatsby?", "Como usa el autor la ironia en este pasaje?"],
    ZH: ["《了不起的盖茨比》中绿灯象征什么？", "作者在这段话中如何运用反讽？"],
  },
  ECONOMICS: {
    EN: ["What happens to price when demand increases but supply stays the same?", "Explain the concept of opportunity cost with an example."],
    HI: ["जब demand बढ़ती है लेकिन supply वही रहती है तो price पर क्या असर होता है?", "Opportunity cost को एक उदाहरण से समझाइए।"],
    FR: ["Que se passe-t-il quand la demande augmente mais l'offre reste stable ?", "Expliquez le cout d'opportunite avec un exemple."],
    DE: ["Was passiert mit dem Preis, wenn die Nachfrage steigt aber das Angebot gleich bleibt?", "Erklaere Opportunitaetskosten mit einem Beispiel."],
    ES: ["Que pasa con el precio cuando la demanda sube pero la oferta no cambia?", "Explica el costo de oportunidad con un ejemplo."],
    ZH: ["当需求增加但供给不变时价格会怎样？", "用一个例子解释机会成本。"],
  },
  AI_LEARNING: {
    EN: ["What's the difference between classification and regression?", "How does a computer learn to recognize faces?"],
    HI: ["Classification और regression में क्या अंतर है?", "Computer चेहरे कैसे पहचानना सीखता है?"],
    FR: ["Quelle est la difference entre classification et regression ?", "Comment un ordinateur apprend-il a reconnaitre des visages ?"],
    DE: ["Was ist der Unterschied zwischen Klassifikation und Regression?", "Wie lernt ein Computer Gesichter zu erkennen?"],
    ES: ["Cual es la diferencia entre clasificacion y regresion?", "Como aprende una computadora a reconocer rostros?"],
    ZH: ["分类和回归有什么区别？", "计算机如何学习识别人脸？"],
  },
  ESSAY_WRITING: {
    EN: ["Help me brainstorm ideas for my Common App essay about resilience.", "I have a draft about my community service — can you help me improve it?"],
  },
  COUNSELING: {
    EN: ["I'm confused about choosing between engineering and medicine.", "What extracurriculars should I focus on for college applications?"],
  },
};

export function WelcomeScreen({ onStarterClick }: WelcomeScreenProps) {
  const { t } = useTranslation();
  const { language, subject, setSubject } = useChatStore();

  const categories: SubjectCategory[] = ['stem', 'humanities', 'skills'];

  const prompts = STARTER_PROMPTS[subject]?.[language]
    || STARTER_PROMPTS[subject]?.EN
    || STARTER_PROMPTS.PHYSICS?.EN
    || [];

  return (
    <div className="flex flex-col items-center justify-center py-6 px-4 max-w-3xl mx-auto animate-fade-in">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {t('app.name')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 -mt-0.5">{t('app.tagline')}</p>
        </div>
      </div>

      {/* Subject picker grouped by category */}
      <div className="w-full mt-6 space-y-4 rounded-2xl bg-white/80 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-700/70 p-4 shadow-sm backdrop-blur-sm">
        {categories.map(cat => {
          const subjects = SUBJECT_META.filter(s => s.category === cat);
          return (
            <div key={cat}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 px-1">
                {CATEGORY_LABELS[cat][language] || CATEGORY_LABELS[cat].EN}
              </h3>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {subjects.map(s => {
                  const Icon = SUBJECT_ICONS[s.id];
                  const isActive = subject === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSubject(s.id)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all",
                        "border-2",
                        isActive
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-md shadow-blue-500/10"
                          : "border-transparent bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700/60 hover:border-slate-200 dark:hover:border-slate-600"
                      )}
                    >
                      <div className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br",
                        s.color,
                        isActive ? "shadow-lg" : "opacity-80"
                      )}>
                        <Icon className="w-4.5 h-4.5 text-white" />
                      </div>
                      <span className={cn(
                        "text-xs font-medium text-center leading-tight",
                        isActive ? "text-blue-700 dark:text-blue-300" : "text-slate-600 dark:text-slate-400"
                      )}>
                        {s.label[language] || s.label.EN}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Starter prompts for selected subject */}
      {prompts.length > 0 && (
        <div className="w-full mt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 px-1">
            {language === 'HI' ? 'शुरू करें' : language === 'ZH' ? '快速开始' : language === 'FR' ? 'Commencer' : language === 'DE' ? 'Loslegen' : language === 'ES' ? 'Empezar' : 'Try asking'}
          </h3>
          <div className="space-y-2">
            {prompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => onStarterClick(prompt)}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-xl transition-all",
                  "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700",
                  "hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md hover:shadow-blue-500/5",
                  "text-sm text-slate-700 dark:text-slate-300"
                )}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tip */}
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-6 text-center">
        {language === 'HI' ? 'कोई भी सवाल पूछें — Vid (Vidya) Socratic method से सिखाती है'
         : language === 'ZH' ? '随时提问 — Vid (Vidya) 通过苏格拉底式提问引导学习'
         : language === 'FR' ? 'Posez votre question — Vid (Vidya) enseigne par la methode socratique'
         : language === 'DE' ? 'Stellen Sie Ihre Frage — Vid (Vidya) lehrt mit der sokratischen Methode'
         : language === 'ES' ? 'Haz tu pregunta — Vid (Vidya) ensena con el metodo socratico'
         : 'Ask anything — Vid (Vidya) teaches through Socratic questioning'}
      </p>
    </div>
  );
}
