import { describe, expect, it } from "vitest";
import {
  normalizeLegacyExerciseLatex,
  parseLegacyExerciseInline,
} from "@/lib/legacy-exercise-inline";

describe("legacy exercise inline parser", () => {
  it("separates prose and the reported Noether formulas", () => {
    expect(
      parseLegacyExerciseInline(
        "得到 T^μ_ν=[∂L/∂(∂_μφ_a)]∂_νφ_a-δ^μ_νL；无显式坐标依赖时 ∂_μT^μ_ν=0。",
      ),
    ).toEqual([
      { kind: "text", text: "得到 " },
      {
        kind: "math",
        latex:
          "T^\\mu_\\nu=[\\partial L/\\partial(\\partial_\\mu \\phi_a)]\\partial_\\nu \\phi_a-\\delta^\\mu_\\nu L",
      },
      { kind: "text", text: "；无显式坐标依赖时 " },
      { kind: "math", latex: "\\partial_\\mu T^\\mu_\\nu=0" },
      { kind: "text", text: "。" },
    ]);
  });

  it("normalizes Unicode roots, indices, Greek letters, functions and operators", () => {
    expect(normalizeLegacyExerciseLatex("ω₀=√(k/m)")).toBe("\\omega_{0}=\\sqrt{k/m}");
    expect(normalizeLegacyExerciseLatex("Θ(|V|²)")).toBe("\\Theta(|V|^{2})");
    expect(normalizeLegacyExerciseLatex("E₀±|V_G|")).toBe("E_{0}\\pm |V_G|");
    expect(normalizeLegacyExerciseLatex("ord([a])=n/gcd(a,n)")).toBe(
      "\\operatorname{ord}([a])=n/\\gcd(a,n)",
    );
    expect(normalizeLegacyExerciseLatex("Trρ²")).toBe("\\operatorname{Tr}\\rho^{2}");
  });

  it("limits an unbracketed root to one atom instead of swallowing adjacent factors", () => {
    expect(normalizeLegacyExerciseLatex("√3e^{iφ}")).toBe("\\sqrt{3}e^{i\\phi}");
    expect(normalizeLegacyExerciseLatex("√2x1")).toBe("\\sqrt{2}x1");
    expect(normalizeLegacyExerciseLatex("√3ℏ/4")).toBe("\\sqrt{3}\\hbar/4");
    expect(normalizeLegacyExerciseLatex("√E_F")).toBe("\\sqrt{E_F}");
    expect(normalizeLegacyExerciseLatex("1/√n!")).toBe("1/\\sqrt{n!}");
    expect(normalizeLegacyExerciseLatex("√(ε)")).toBe("\\sqrt{\\epsilon}");
    expect(normalizeLegacyExerciseLatex("√(λ_K(M²,m₁²,m₂²))")).toBe(
      "\\sqrt{\\lambda_K(M^{2},m_{1}^{2},m_{2}^{2})}",
    );
    expect(normalizeLegacyExerciseLatex("1.328/√(\\mathrm{Re}_L)")).toBe(
      "1.328/\\sqrt{\\mathrm{Re}_L}",
    );
  });

  it("groups only corpus-reviewed multi-character subscripts", () => {
    expect(normalizeLegacyExerciseLatex("p_data+r_new+u_xx+E_tot+P_out+E_CM")).toBe(
      "p_{data}+r_{new}+u_{xx}+E_{tot}+P_{out}+E_{CM}",
    );
    expect(normalizeLegacyExerciseLatex("d_111+g_00+G_111+i_00")).toBe(
      "d_{111}+g_{00}+G_{111}+i_{00}",
    );
    expect(normalizeLegacyExerciseLatex("s_is_j")).toBe("s_{i}s_j");
    expect(normalizeLegacyExerciseLatex("j_oldS")).toBe("j_{old}S");
    expect(normalizeLegacyExerciseLatex("E_CM,min")).toBe("E_{CM,\\mathrm{min}}");
    expect(normalizeLegacyExerciseLatex("2dd_ff+E_0=-2NJ_ex")).toBe("2d d_{ff}+E_0=-2N J_{ex}");
    expect(normalizeLegacyExerciseLatex("ṁ_in-ṁ_out")).toBe("\\dot{m}_{in}-\\dot{m}_{out}");
    expect(
      normalizeLegacyExerciseLatex(
        "κu_xx+λV_mn+E_tot²-p_tot²+M_sys²+E_CM²+ΔU_cycle+p_extΔV+c²u_xx+μ₀I_enc",
      ),
    ).toBe(
      "\\kappa u_{xx}+\\lambda V_{mn}+E_{tot}^{2}-p_{tot}^{2}+M_{sys}^{2}+E_{CM}^{2}+\\Delta U_{cycle}+p_{ext}\\Delta V+c^{2}u_{xx}+\\mu_{0}I_{enc}",
    );
  });

  it("keeps adjacent factors outside one-character subscripts", () => {
    expect(normalizeLegacyExerciseLatex("k_BT+nk_BT+Nk_BT+k_eq+P_Mx+R_gh+S_gf+T_gx+T_ct̂")).toBe(
      "k_B T+nk_B T+Nk_B T+k_e q+P_M x+R_g h+S_g f+T_g x+T_c\\hat{t}",
    );
    expect(normalizeLegacyExerciseLatex("μ_sN+ω_st+∂_tn+Σ_jw_ij")).toBe(
      "\\mu_s N+\\omega_s t+\\partial_t n+\\Sigma_j w_{ij}",
    );
    expect(normalizeLegacyExerciseLatex("∂_jg_00+ρ_jV_j+Σ_pE_p")).toBe(
      "\\partial_j g_{00}+\\rho_j V_j+\\Sigma_p E_p",
    );
  });

  it("groups reviewed Greek labels without swallowing adjacent factors", () => {
    expect(normalizeLegacyExerciseLatex("τ_int+δ_ij+μ_batch+Σ_ij+λ_max+ω_max+Σ_final+τ_SI")).toBe(
      "\\tau_{\\mathrm{int}}+\\delta_{ij}+\\mu_{\\mathrm{batch}}+\\Sigma_{ij}+\\lambda_{\\max}+\\omega_{\\max}+\\Sigma_{\\mathrm{final}}+\\tau_{\\mathrm{SI}}",
    );
  });

  it("normalizes corpus-reviewed adjacent functions without touching identifiers", () => {
    expect(normalizeLegacyExerciseLatex("mBsinθ+mBcosθ+4Ksin²(ka/2)")).toBe(
      "mB\\sin \\theta+mB\\cos \\theta+4K\\sin^{2}(ka/2)",
    );
    expect(normalizeLegacyExerciseLatex("lnZ'+ln210+ln4+ln2")).toBe(
      "\\ln Z'+\\ln 210+\\ln 4+\\ln 2",
    );
    expect(normalizeLegacyExerciseLatex("log0.1+log2+log4+atan2(v,x)")).toBe(
      "\\log 0.1+\\log 2+\\log 4+\\operatorname{atan2}(v,x)",
    );
    expect(normalizeLegacyExerciseLatex("barψ+mbarψ+Im(ψ*∇ψ)+Qdot")).toBe(
      "\\bar{\\psi}+m\\bar{\\psi}+\\operatorname{Im}(\\psi^{*}\\nabla \\psi)+\\dot{Q}",
    );
    expect(normalizeLegacyExerciseLatex("∂_μbarψ+barψγ^μ")).toBe(
      "\\partial_\\mu \\bar{\\psi}+\\bar{\\psi}\\gamma^\\mu",
    );
    for (const identifier of ["assistant", "single", "singlet", "logit", "logits", "softmax"]) {
      expect(normalizeLegacyExerciseLatex(identifier)).toBe(identifier);
    }
    for (const identifier of ["max_steps", "min_delta", "min_lr"]) {
      expect(parseLegacyExerciseInline(identifier)).toEqual([{ kind: "code", code: identifier }]);
    }
    for (const identifier of [
      "Ksingle",
      "mBsinh",
      "lnZeta",
      "log2_value",
      "Qdot2",
      "NJ_extra",
      "dd_ffn",
      "J_ex_more",
      "myfan_in",
    ]) {
      expect(normalizeLegacyExerciseLatex(identifier)).toBe(identifier);
    }
    expect(normalizeLegacyExerciseLatex("ṁ_in_more")).toBe("\\dot{m}_in_more");
  });

  it("groups time indices, Unicode exponent fractions and derivative marks", () => {
    expect(normalizeLegacyExerciseLatex("hₜ=tanh(Wₓxₜ+Wₕhₜ₋₁)")).toBe(
      "h_{t}=\\tanh(W_{x}x_{t}+W_{h}h_{t-1})",
    );
    expect(normalizeLegacyExerciseLatex("e⁻ᵝ⁽ε⁻μ⁾")).toBe("e^{-\\beta(\\epsilon-\\mu)}");
    expect(normalizeLegacyExerciseLatex("tL¹ᐟν")).toBe("tL^{1/\\nu}");
    expect(normalizeLegacyExerciseLatex("mLᵝᐟν")).toBe("mL^{\\beta/\\nu}");
    expect(normalizeLegacyExerciseLatex("[ψ]=m⁻¹ᐟ²")).toBe("[\\psi]=m^{-1/2}");
    expect(normalizeLegacyExerciseLatex("ṁ=kg·s⁻¹")).toBe("\\dot{m}=kg\\cdot s^{-1}");
  });

  it("recognizes compact indexed symbols without converting snake-case code", () => {
    expect(parseLegacyExerciseInline("取 N_c 与 J_+。")).toEqual([
      { kind: "text", text: "取 " },
      { kind: "math", latex: "N_c" },
      { kind: "text", text: " 与 " },
      { kind: "math", latex: "J_+" },
      { kind: "text", text: "。" },
    ]);
    expect(parseLegacyExerciseInline("要求 end_time≥start_time。")).toEqual([
      { kind: "text", text: "要求 " },
      { kind: "code", code: "end_time≥start_time" },
      { kind: "text", text: "。" },
    ]);
  });

  it("keeps mixed scientific expressions out of the code path", () => {
    const formulas = [
      "-hx_0",
      "q*(s,a)=E[R+γ max_a' q*(S',a')|s,a]",
      "a²/3=2/(fan_in+fan_out)",
      "a=√[6/(fan_in+fan_out)]",
      "2/fan_in",
      "[L:Lᴴ]=|H|",
      "[Lᴴ:K]=[G:H]",
      "L=[[0,-Ω,0],[Ω,0,0],[0,0,0]]",
      "[[8,3],[3,2]] MPa",
      "[[a,c-id],[c+id,b]]",
      "ΔH=nc_pΔT",
      "ck_w",
      "u_xx",
      "x_a=y_a",
      "v_y=u_x",
      "f_1=f_2",
      "p_ext",
      "u_tt",
    ];

    for (const formula of formulas) {
      expect(parseLegacyExerciseInline(formula), formula).toEqual([
        { kind: "math", latex: normalizeLegacyExerciseLatex(formula) },
      ]);
    }
    expect(normalizeLegacyExerciseLatex("a=√[6/(fan_in+fan_out)]")).toBe(
      "a=\\sqrt{6/(fan_{in}+fan_{out})}",
    );
    expect(normalizeLegacyExerciseLatex("[L:Lᴴ]=|H|")).toBe("[L:L^{H}]=|H|");
    expect(normalizeLegacyExerciseLatex("ΔH=nc_pΔT")).toBe("\\Delta H=nc_p\\Delta T");
    expect(normalizeLegacyExerciseLatex("∫_{0}^{E_F}C√E dE")).toBe("\\int_{0}^{E_F}C\\sqrt{E} dE");
  });

  it("supports legacy logic, form, composition and state symbols", () => {
    expect(normalizeLegacyExerciseLatex("A⊥C|B←D")).toBe("A\\perp C|B\\leftarrow D");
    expect(normalizeLegacyExerciseLatex("dy∧dx∼f_K∘f_1")).toBe("dy\\wedge dx\\sim f_K\\circ f_1");
    expect(normalizeLegacyExerciseLatex("cₜ=fₜ⊙cₜ₋₁")).toBe("c_{t}=f_{t}\\odot c_{t-1}");
    expect(normalizeLegacyExerciseLatex("v∅⋆|↑↓⟩†")).toBe(
      "v\\varnothing \\star |\\uparrow \\downarrow \\rangle^{\\dagger}",
    );
    expect(normalizeLegacyExerciseLatex("[a,a†]+φ*ψ+q*(s,a)+M*M")).toBe(
      "[a,a^{\\dagger}]+\\phi^{*}\\psi+q^{*}(s,a)+M^{*}M",
    );
    expect(normalizeLegacyExerciseLatex("Rⁿ/Rᵐ")).toBe("R^{n}/R^{m}");
  });

  it("conservatively renders ASCII relations while leaving assignment-like text alone", () => {
    expect(parseLegacyExerciseInline("TP=80，F1=2TP/(2TP+FP+FN)。")).toEqual([
      { kind: "text", text: "TP=80，" },
      { kind: "math", latex: "F1=2TP/(2TP+FP+FN)" },
      { kind: "text", text: "。" },
    ]);
    expect(parseLegacyExerciseInline("赋值 x=3，设置 axis=1。")).toEqual([
      { kind: "text", text: "赋值 x=3，设置 " },
      { kind: "code", code: "axis=1" },
      { kind: "text", text: "。" },
    ]);
    for (const codeLike of ["k<a", "d=a", "b=a", "3==3.0", "k=0,total=0,k=n"]) {
      expect(parseLegacyExerciseInline(codeLike), codeLike).toEqual([
        { kind: "text", text: codeLike },
      ]);
    }
  });

  it("recognizes arithmetic identities, derivatives, units and standard physics products", () => {
    const formulas = [
      "2000/1000=2",
      "9+9-4=14",
      "f'=2zf",
      "V''=0",
      "m x¨+kx=0",
      "pV=nRT",
      "MSD=6Dt",
      "Dv/Dt=0",
      "10 meV=0.010 eV",
      "x=0.10 m",
      "E[mh/q]=h",
      "(slash p-m)u=0",
      "||w||=1",
      "dX=GWᵀ",
    ];

    for (const formula of formulas) {
      expect(parseLegacyExerciseInline(formula), formula).toEqual([
        { kind: "math", latex: normalizeLegacyExerciseLatex(formula) },
      ]);
    }
    expect(normalizeLegacyExerciseLatex("10 meV=0.010 eV")).toBe(
      "10\\,\\mathrm{meV}=0.010\\,\\mathrm{eV}",
    );
    expect(normalizeLegacyExerciseLatex("(slash p-m)u=0")).toBe("(\\not\\!p-m)u=0");
    expect(normalizeLegacyExerciseLatex("dX=GWᵀ")).toBe("dX=GW^{\\mathsf T}");
  });

  it("keeps code identifiers and slicing out of math", () => {
    expect(parseLegacyExerciseInline("字段 device_id 与 local_date 保持不变。")).toEqual([
      { kind: "text", text: "字段 " },
      { kind: "code", code: "device_id" },
      { kind: "text", text: " 与 " },
      { kind: "code", code: "local_date" },
      { kind: "text", text: " 保持不变。" },
    ]);
    expect(parseLegacyExerciseInline("令 b=a[:,1:3]，并设置 axis=1。")).toEqual([
      { kind: "text", text: "令 " },
      { kind: "code", code: "b=a[:,1:3]" },
      { kind: "text", text: "，并设置 " },
      { kind: "code", code: "axis=1" },
      { kind: "text", text: "。" },
    ]);
    expect(parseLegacyExerciseInline("要求 end_time≥start_time。")).toEqual([
      { kind: "text", text: "要求 " },
      { kind: "code", code: "end_time≥start_time" },
      { kind: "text", text: "。" },
    ]);
  });

  it("preserves explicit math and inline code delimiters", () => {
    expect(parseLegacyExerciseInline("对 $y'=-8y$，保留 `max_steps`。")).toEqual([
      { kind: "text", text: "对 " },
      { kind: "math", latex: "y'=-8y" },
      { kind: "text", text: "，保留 " },
      { kind: "code", code: "max_steps" },
      { kind: "text", text: "。" },
    ]);
  });
});
