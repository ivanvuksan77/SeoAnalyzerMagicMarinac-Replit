import { useTranslation } from "react-i18next";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  const { t } = useTranslation();

  const handleCtaClick = () => {
    const el = document.getElementById("scanner");
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>(
        '[data-testid="master-url"]'
      );
      input?.focus({ preventScroll: true });
    }, 650);
  };

  return (
    <section className="relative overflow-hidden">
      {/* soft gradient background + blobs (scoped to hero only) */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-50/60 via-background to-background dark:from-blue-950/30 dark:via-background pointer-events-none" />
      <div className="absolute -top-40 -right-32 w-[520px] h-[520px] rounded-full bg-blue-400/20 dark:bg-blue-500/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-[380px] h-[380px] rounded-full bg-blue-400/15 dark:bg-blue-500/15 blur-3xl pointer-events-none" />

      <div className="relative container mx-auto px-4 pt-12 pb-16 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
        {/* LEFT — copy + CTA */}
        <div>
          <div
            className="mb-6 text-primary"
            data-testid="hero-eyebrow"
          >
            <span className="text-sm font-semibold">
              {t("hero.eyebrow")}
            </span>
          </div>

          <h1
            className="text-4xl md:text-5xl lg:text-[52px] leading-[1.05] font-bold mb-5 text-foreground"
            style={{ letterSpacing: "-0.035em" }}
            data-testid="text-hero-title"
          >
            {t("hero.lead")}{" "}
            <span className="text-primary">{t("hero.accent")}</span>
          </h1>

          <p
            className="text-base md:text-[17px] leading-relaxed text-muted-foreground mb-8 max-w-[540px]"
            data-testid="text-hero-sub"
          >
            {t("hero.sub")}
          </p>

          <Button
            size="lg"
            onClick={handleCtaClick}
            className="h-14 px-7 text-base font-semibold gap-2 shadow-lg shadow-primary/30 hover:shadow-primary/40 hover:scale-[1.02] transition-transform group"
            data-testid="button-hero-cta"
          >
            {t("hero.cta")}
            <ArrowRight
              className="w-5 h-5 transition-transform group-hover:translate-x-1"
              strokeWidth={2.4}
            />
          </Button>

          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <TrustItem text={t("hero.trust1")} />
            <TrustItem text={t("hero.trust2")} />
            <TrustItem text={t("hero.trust3")} />
          </div>
        </div>

        {/* RIGHT — hero image */}
        <div className="relative flex items-center justify-center lg:justify-end">
          <svg width="652" height="430" viewBox="0 0 652 430" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-[560px] mx-auto lg:ml-auto">
          <g filter="url(#filter0_d_374_821)">
          <rect x="57" y="71" width="348.21" height="81.8519" rx="10.0741" fill="white" shape-rendering="crispEdges"/>
          <path d="M72.1113 101.222C72.1113 91.4858 80.0044 83.5928 89.741 83.5928H108.581C118.317 83.5928 126.21 91.4858 126.21 101.222V121.371C126.21 131.107 118.317 139 108.581 139H89.7409C80.0044 139 72.1113 131.107 72.1113 121.371V101.222Z" fill="#E6E0FF"/>
          <g clip-path="url(#clip0_374_821)">
          <path d="M99.1558 103.951C99.157 103.532 99.0743 103.116 98.9126 102.729C98.7508 102.341 98.5132 101.99 98.2137 101.696C97.9143 101.402 97.5591 101.171 97.169 101.016C96.7788 100.861 96.3617 100.786 95.9421 100.795C95.5224 100.803 95.1088 100.896 94.7255 101.067C94.3421 101.238 93.9968 101.484 93.7099 101.79C93.423 102.096 93.2003 102.457 93.0547 102.851C92.9092 103.244 92.8439 103.663 92.8627 104.083C92.2458 104.241 91.6732 104.538 91.1881 104.951C90.703 105.363 90.3182 105.881 90.0627 106.464C89.8073 107.048 89.688 107.682 89.7139 108.318C89.7397 108.955 89.91 109.577 90.2119 110.137C89.6811 110.569 89.2637 111.123 88.996 111.752C88.7284 112.382 88.6185 113.067 88.676 113.748C88.7335 114.43 88.9567 115.087 89.326 115.663C89.6954 116.238 90.1998 116.715 90.7954 117.051C90.7218 117.62 90.7657 118.198 90.9243 118.749C91.0829 119.301 91.3529 119.814 91.7176 120.257C92.0822 120.7 92.5338 121.063 93.0444 121.325C93.5551 121.586 94.1139 121.74 94.6865 121.778C95.259 121.815 95.8331 121.734 96.3732 121.541C96.9134 121.347 97.4082 121.045 97.827 120.653C98.2459 120.261 98.5799 119.787 98.8084 119.261C99.037 118.735 99.1552 118.167 99.1558 117.593V103.951Z" stroke="#7F22FE" stroke-width="2.51852" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M99.1558 103.951C99.1545 103.532 99.2372 103.116 99.399 102.729C99.5608 102.341 99.7984 101.99 100.098 101.696C100.397 101.402 100.752 101.171 101.143 101.016C101.533 100.861 101.95 100.786 102.37 100.795C102.789 100.803 103.203 100.896 103.586 101.067C103.969 101.238 104.315 101.484 104.602 101.79C104.889 102.096 105.111 102.457 105.257 102.851C105.402 103.244 105.468 103.663 105.449 104.083C106.066 104.241 106.638 104.538 107.123 104.951C107.609 105.363 107.993 105.881 108.249 106.464C108.504 107.048 108.624 107.682 108.598 108.318C108.572 108.955 108.402 109.577 108.1 110.137C108.63 110.569 109.048 111.123 109.316 111.752C109.583 112.382 109.693 113.067 109.636 113.748C109.578 114.43 109.355 115.087 108.986 115.663C108.616 116.238 108.112 116.715 107.516 117.051C107.59 117.62 107.546 118.198 107.387 118.749C107.229 119.301 106.959 119.814 106.594 120.257C106.229 120.7 105.778 121.063 105.267 121.325C104.757 121.586 104.198 121.74 103.625 121.778C103.053 121.815 102.478 121.734 101.938 121.541C101.398 121.347 100.903 121.045 100.485 120.653C100.066 120.261 99.7317 119.787 99.5032 119.261C99.2746 118.735 99.1564 118.167 99.1558 117.593V103.951Z" stroke="#7F22FE" stroke-width="2.51852" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M102.304 112.346C101.423 112.036 100.654 111.472 100.093 110.725C99.533 109.978 99.2068 109.081 99.156 108.148C99.1051 109.081 98.7789 109.978 98.2185 110.725C97.6582 111.472 96.8888 112.036 96.0078 112.346" stroke="#7F22FE" stroke-width="2.51852" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M105.031 105.525C105.285 105.085 105.429 104.59 105.45 104.082" stroke="#7F22FE" stroke-width="2.51852" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M92.8623 104.082C92.8831 104.59 93.0264 105.085 93.28 105.525" stroke="#7F22FE" stroke-width="2.51852" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M90.2119 110.138C90.4039 109.982 90.6093 109.843 90.8258 109.723" stroke="#7F22FE" stroke-width="2.51852" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M107.486 109.723C107.702 109.843 107.908 109.982 108.1 110.138" stroke="#7F22FE" stroke-width="2.51852" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M92.8595 117.593C92.1363 117.594 91.4253 117.407 90.7954 117.052" stroke="#7F22FE" stroke-width="2.51852" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M107.516 117.052C106.886 117.407 106.175 117.594 105.452 117.593" stroke="#7F22FE" stroke-width="2.51852" stroke-linecap="round" stroke-linejoin="round"/>
          </g>
          <text fill="#6A7282" style="white-space: pre" xml:space="preserve" font-family="Inter" font-size="12.5926" font-weight="500" letter-spacing="-0.02em"><tspan x="141.321" y="101.533">Optimizacija za umjetnu inteligenciju</tspan></text>
          <text fill="#7F22FE" style="white-space: pre" xml:space="preserve" font-family="Inter" font-size="22.6667" font-weight="bold" letter-spacing="-0.02em"><tspan x="141.321" y="127.863">AIO/AEO/GEO</tspan></text>
          </g>
          <g filter="url(#filter1_d_374_821)">
          <rect x="139" y="278" width="340.519" height="81.8519" rx="10.0741" fill="white" shape-rendering="crispEdges"/>
          <g filter="url(#filter2_d_374_821)">
          <path d="M154.111 308.222C154.111 298.486 162.004 290.593 171.741 290.593H191.889C201.626 290.593 209.519 298.486 209.519 308.222V328.371C209.519 338.107 201.626 346 191.889 346H171.741C162.004 346 154.111 338.107 154.111 328.371V308.222Z" fill="#D1E5FF" shape-rendering="crispEdges"/>
          <path d="M180.766 325.642C185.402 325.642 189.161 321.883 189.161 317.247C189.161 312.61 185.402 308.852 180.766 308.852C176.129 308.852 172.371 312.61 172.371 317.247C172.371 321.883 176.129 325.642 180.766 325.642Z" stroke="#155DFC" stroke-width="2.51852" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M191.259 327.741L186.747 323.229" stroke="#155DFC" stroke-width="2.51852" stroke-linecap="round" stroke-linejoin="round"/>
          </g>
          <text fill="#6A7282" style="white-space: pre" xml:space="preserve" font-family="Inter" font-size="12.5926" font-weight="500" letter-spacing="-0.02em"><tspan x="224.629" y="308.533">Temeljna optimizacija web stranice</tspan></text>
          <text fill="#155DFC" style="white-space: pre" xml:space="preserve" font-family="Inter" font-size="22.6667" font-weight="bold" letter-spacing="-0.02em"><tspan x="224.629" y="334.862">SEO optimizacija</tspan></text>
          </g>
          <g filter="url(#filter3_d_374_821)">
          <rect x="231" y="174" width="364.519" height="81.8519" rx="10.0741" fill="white" shape-rendering="crispEdges"/>
          <g filter="url(#filter4_d_374_821)">
          <path d="M246.111 204.222C246.111 194.486 254.004 186.593 263.74 186.593H283.889C293.625 186.593 301.518 194.486 301.518 204.222V224.371C301.518 234.107 293.625 242 283.889 242H263.74C254.004 242 246.111 234.107 246.111 224.371V204.222Z" fill="#D5FBE9" shape-rendering="crispEdges"/>
          <path d="M276.648 208.315C276.456 208.511 276.348 208.775 276.348 209.05C276.348 209.324 276.456 209.588 276.648 209.784L278.327 211.463C278.523 211.655 278.787 211.763 279.062 211.763C279.337 211.763 279.6 211.655 279.796 211.463L283.753 207.507C284.28 208.673 284.44 209.972 284.211 211.231C283.981 212.491 283.373 213.65 282.468 214.555C281.563 215.46 280.404 216.068 279.145 216.297C277.886 216.527 276.587 216.367 275.421 215.839L268.169 223.09C267.752 223.508 267.186 223.742 266.595 223.742C266.005 223.742 265.439 223.508 265.021 223.09C264.604 222.673 264.369 222.107 264.369 221.516C264.369 220.926 264.604 220.36 265.021 219.942L272.272 212.691C271.745 211.525 271.585 210.226 271.814 208.967C272.044 207.707 272.652 206.548 273.557 205.643C274.462 204.738 275.621 204.13 276.88 203.901C278.139 203.671 279.438 203.831 280.604 204.359L276.659 208.305L276.648 208.315Z" stroke="#009966" stroke-width="2.51852" stroke-linecap="round" stroke-linejoin="round"/>
          </g>
          <text fill="#6A7282" style="white-space: pre" xml:space="preserve" font-family="Inter" font-size="12.5926" font-weight="500" letter-spacing="-0.02em"><tspan x="316.629" y="204.533">Pro izvje&#x161;taj sa popravcima i rje&#x161;enjima</tspan></text>
          <text fill="#009966" style="white-space: pre" xml:space="preserve" font-family="Inter" font-size="22.6667" font-weight="bold" letter-spacing="-0.02em"><tspan x="316.629" y="230.862">Pro rje&#x161;enja</tspan></text>
          </g>
          <path d="M30 245C63.6894 245 91 272.311 91 306C91 272.311 118.311 245 152 245C118.311 245 91 217.689 91 184C91 217.689 63.6894 245 30 245Z" fill="white"/>
          <path d="M30 245C63.6894 245 91 272.311 91 306C91 272.311 118.311 245 152 245C118.311 245 91 217.689 91 184C91 217.689 63.6894 245 30 245Z" fill="url(#paint0_linear_374_821)"/>
          <path d="M446 35.5C458.979 35.5 469.5 46.0213 469.5 59C469.5 46.0213 480.021 35.5 493 35.5C480.021 35.5 469.5 24.9787 469.5 12C469.5 24.9787 458.979 35.5 446 35.5Z" fill="white"/>
          <path d="M446 35.5C458.979 35.5 469.5 46.0213 469.5 59C469.5 46.0213 480.021 35.5 493 35.5C480.021 35.5 469.5 24.9787 469.5 12C469.5 24.9787 458.979 35.5 446 35.5Z" fill="url(#paint1_linear_374_821)"/>
          <defs>
          <filter id="filter0_d_374_821" x="26.7778" y="40.7778" width="408.654" height="142.296" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
          <feFlood flood-opacity="0" result="BackgroundImageFix"/>
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
          <feOffset/>
          <feGaussianBlur stdDeviation="15.1111"/>
          <feComposite in2="hardAlpha" operator="out"/>
          <feColorMatrix type="matrix" values="0 0 0 0 0.0602459 0 0 0 0 0.107962 0 0 0 0 0.346543 0 0 0 0.15 0"/>
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_374_821"/>
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_374_821" result="shape"/>
          </filter>
          <filter id="filter1_d_374_821" x="108.778" y="247.778" width="400.963" height="142.296" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
          <feFlood flood-opacity="0" result="BackgroundImageFix"/>
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
          <feOffset/>
          <feGaussianBlur stdDeviation="15.1111"/>
          <feComposite in2="hardAlpha" operator="out"/>
          <feColorMatrix type="matrix" values="0 0 0 0 0.0602459 0 0 0 0 0.107962 0 0 0 0 0.346543 0 0 0 0.15 0"/>
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_374_821"/>
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_374_821" result="shape"/>
          </filter>
          <filter id="filter2_d_374_821" x="152.852" y="289.334" width="57.9257" height="57.9257" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
          <feFlood flood-opacity="0" result="BackgroundImageFix"/>
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
          <feMorphology radius="1.25926" operator="dilate" in="SourceAlpha" result="effect1_dropShadow_374_821"/>
          <feOffset/>
          <feComposite in2="hardAlpha" operator="out"/>
          <feColorMatrix type="matrix" values="0 0 0 0 0.858824 0 0 0 0 0.917647 0 0 0 0 0.996078 0 0 0 1 0"/>
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_374_821"/>
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_374_821" result="shape"/>
          </filter>
          <filter id="filter3_d_374_821" x="200.778" y="143.778" width="424.963" height="142.296" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
          <feFlood flood-opacity="0" result="BackgroundImageFix"/>
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
          <feOffset/>
          <feGaussianBlur stdDeviation="15.1111"/>
          <feComposite in2="hardAlpha" operator="out"/>
          <feColorMatrix type="matrix" values="0 0 0 0 0.0602459 0 0 0 0 0.107962 0 0 0 0 0.346543 0 0 0 0.15 0"/>
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_374_821"/>
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_374_821" result="shape"/>
          </filter>
          <filter id="filter4_d_374_821" x="244.852" y="185.334" width="57.9257" height="57.9257" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
          <feFlood flood-opacity="0" result="BackgroundImageFix"/>
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
          <feMorphology radius="1.25926" operator="dilate" in="SourceAlpha" result="effect1_dropShadow_374_821"/>
          <feOffset/>
          <feComposite in2="hardAlpha" operator="out"/>
          <feColorMatrix type="matrix" values="0 0 0 0 0.815686 0 0 0 0 0.980392 0 0 0 0 0.898039 0 0 0 1 0"/>
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_374_821"/>
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_374_821" result="shape"/>
          </filter>
          <linearGradient id="paint0_linear_374_821" x1="104.5" y1="270" x2="85" y2="207" gradientUnits="userSpaceOnUse">
          <stop stop-color="#009966" stop-opacity="0.4"/>
          <stop offset="1" stop-color="#7F22FE" stop-opacity="0.4"/>
          </linearGradient>
          <linearGradient id="paint1_linear_374_821" x1="474.701" y1="45.1311" x2="467.189" y2="20.8607" gradientUnits="userSpaceOnUse">
          <stop stop-color="#009966" stop-opacity="0.4"/>
          <stop offset="1" stop-color="#155DFC" stop-opacity="0.4"/>
          </linearGradient>
          <clipPath id="clip0_374_821">
          <rect width="25.1852" height="25.1852" fill="white" transform="translate(86.563 98.7041)"/>
          </clipPath>
          </defs>
          </svg>

        </div>
      </div>
    </section>
  );
}

function TrustItem({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <CheckCircle2 className="w-4 h-4 text-emerald-500" strokeWidth={2.4} />
      {text}
    </span>
  );
}

