//! Offline B2 deterministic grading port of src/lib/grading.ts.
//! NOT a public API: authorization, session, storage and billing remain
//! unmigrated. The fixture binary is for offline parity evidence only.
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Question {
    pub id: String,
    pub question_no: u32,
    pub points: f64,
    pub answer: String,
    #[serde(default)]
    pub answer_mode: Option<String>,
    pub concept: String,
    pub solution: String,
    #[serde(default)]
    pub localized: Option<Localized>,
}
#[derive(Debug, Clone, Deserialize)]
pub struct Localized {
    #[serde(default)]
    pub zh: Option<Locale>,
    #[serde(default)]
    pub en: Option<Locale>,
}
#[derive(Debug, Clone, Deserialize)]
pub struct Locale {
    #[serde(default)]
    pub solution: Option<String>,
}
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Profile {
    pub initial_score: f64,
    pub max_score: f64,
    pub wrong_penalty_mode: String,
    pub wrong_penalty_value: f64,
    #[serde(default)]
    pub blank_score_value: Option<f64>,
    #[serde(default)]
    pub blank_score_max_questions: Option<usize>,
    #[serde(default)]
    pub competition_id: Option<String>,
    #[serde(default)]
    pub format_id: Option<String>,
}
#[derive(Debug, Clone, Deserialize)]
pub struct Request {
    pub questions: Vec<Question>,
    pub answers: BTreeMap<String, String>,
    pub profile: Profile,
    #[serde(default)]
    pub lang: Option<String>,
}
#[derive(Debug, Serialize, PartialEq)]
pub struct Counts {
    pub correct: usize,
    pub total: usize,
}
#[derive(Debug, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Item {
    pub question_id: String,
    pub question_no: u32,
    pub selected: Option<String>,
    pub correct_answer: String,
    pub correct: Option<bool>,
    pub score_delta: f64,
    pub points: f64,
    pub concept: String,
    pub solution: String,
}
#[derive(Debug, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Result {
    pub score: f64,
    pub max_score: f64,
    pub correct: usize,
    pub wrong: usize,
    pub blank: usize,
    pub items: Vec<Item>,
    pub by_points: BTreeMap<String, Counts>,
    pub by_concept: BTreeMap<String, Counts>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub by_position: Option<BTreeMap<String, Counts>>,
}
fn equal(q: &Question, s: &str) -> bool {
    fn num(s: &str) -> Option<u16> {
        if (1..=3).contains(&s.len()) && s.bytes().all(|b| b.is_ascii_digit()) {
            s.parse().ok()
        } else {
            None
        }
    }
    if q.answer_mode.as_deref() == Some("integer") {
        if let (Some(a), Some(b)) = (num(s), num(&q.answer)) {
            return a == b;
        }
    }
    s == q.answer
}
fn count(map: &mut BTreeMap<String, Counts>, key: String, good: bool) {
    let e = map.entry(key).or_insert(Counts {
        correct: 0,
        total: 0,
    });
    e.total += 1;
    if good {
        e.correct += 1
    }
}
/// Matches the existing TypeScript gradeExam for validated exam questions.
/// This function does not identify users or persist anything.
pub fn grade(input: &Request) -> Result {
    let p = &input.profile;
    let (mut score, mut yes, mut no, mut blank) = (p.initial_score, 0, 0, 0);
    let mut by_points = BTreeMap::new();
    let mut by_concept = BTreeMap::new();
    let mut by_position = BTreeMap::new();
    let mut items = Vec::with_capacity(input.questions.len());
    for q in &input.questions {
        let selected = input.answers.get(&q.id).cloned();
        let is_blank = selected.as_deref().is_none_or(str::is_empty);
        let good = !is_blank && selected.as_deref().is_some_and(|s| equal(q, s));
        let credit = if blank < p.blank_score_max_questions.unwrap_or(usize::MAX) {
            p.blank_score_value.unwrap_or(0.0)
        } else {
            0.0
        };
        let mut delta = if is_blank {
            credit
        } else if good {
            q.points
        } else if p.wrong_penalty_mode == "quarter-points" {
            -(q.points * p.wrong_penalty_value)
        } else {
            -p.wrong_penalty_value
        };
        if delta == 0.0 {
            delta = 0.0;
        } // JavaScript JSON.stringify(-0) becomes 0
        score += delta;
        if is_blank {
            blank += 1
        } else if good {
            yes += 1
        } else {
            no += 1
        };
        count(&mut by_points, q.points.to_string(), good);
        let localized = q.localized.as_ref();
        let bilingual = localized.is_some_and(|v| v.zh.is_some() && v.en.is_some());
        let concept = if bilingual && p.competition_id.as_deref() != Some("seamo") {
            "official_original".to_string()
        } else {
            q.concept.clone()
        };
        count(&mut by_concept, concept.clone(), good);
        if p.competition_id.as_deref() == Some("maa-amc") {
            let aime = p
                .format_id
                .as_ref()
                .is_some_and(|v| v.starts_with("maa-aime"));
            let key = if aime {
                if q.question_no <= 5 {
                    "Q1–5"
                } else if q.question_no <= 10 {
                    "Q6–10"
                } else {
                    "Q11–15"
                }
            } else if q.question_no <= 10 {
                "Q1–10"
            } else if q.question_no <= 20 {
                "Q11–20"
            } else {
                "Q21–25"
            };
            count(&mut by_position, key.into(), good);
        }
        let solution = if bilingual {
            let l = localized.expect("bilingual");
            let trans = if input.lang.as_deref() == Some("en") {
                &l.en
            } else {
                &l.zh
            };
            trans
                .as_ref()
                .and_then(|x| x.solution.clone())
                .unwrap_or_default()
        } else {
            q.solution.clone()
        };
        items.push(Item {
            question_id: q.id.clone(),
            question_no: q.question_no,
            selected,
            correct_answer: q.answer.clone(),
            correct: if is_blank { None } else { Some(good) },
            score_delta: delta,
            points: q.points,
            concept,
            solution,
        });
    }
    // JavaScript Math.round(x) rounds ties toward positive infinity.
    score = (score * 100.0 + 0.5).floor() / 100.0;
    if score == 0.0 {
        score = 0.0;
    }
    Result {
        score,
        max_score: p.max_score,
        correct: yes,
        wrong: no,
        blank,
        items,
        by_points,
        by_concept,
        by_position: if by_position.is_empty() {
            None
        } else {
            Some(by_position)
        },
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    fn question(id: &str, no: u32, answer: &str, mode: &str) -> Question {
        Question {
            id: id.into(),
            question_no: no,
            points: 5.0,
            answer: answer.into(),
            answer_mode: Some(mode.into()),
            concept: "numbers".into(),
            solution: "default".into(),
            localized: None,
        }
    }
    fn profile() -> Profile {
        Profile {
            initial_score: 0.0,
            max_score: 100.0,
            wrong_penalty_mode: "fixed".into(),
            wrong_penalty_value: 2.0,
            blank_score_value: Some(0.5),
            blank_score_max_questions: Some(1),
            competition_id: None,
            format_id: None,
        }
    }
    #[test]
    fn integer_leading_zero_blank_cap_and_false_answer() {
        let x = Request {
            questions: vec![
                question("a", 1, "005", "integer"),
                question("b", 2, "B", "choice"),
                question("c", 3, "A", "choice"),
                question("d", 4, "A", "choice"),
            ],
            answers: BTreeMap::from([
                ("a".into(), "5".into()),
                ("b".into(), "Z".into()),
                ("c".into(), "".into()),
            ]),
            profile: profile(),
            lang: None,
        };
        let g = grade(&x);
        assert_eq!((g.correct, g.wrong, g.blank), (1, 1, 2));
        assert_eq!(g.score, 3.5);
        assert_eq!(g.items[2].selected.as_deref(), Some(""));
        assert_eq!(g.items[2].correct, None);
    }
    #[test]
    fn quarter_penalty_aime_group_and_bilingual_solution() {
        let mut profile = profile();
        profile.wrong_penalty_mode = "quarter-points".into();
        profile.wrong_penalty_value = 0.25;
        profile.competition_id = Some("maa-amc".into());
        profile.format_id = Some("maa-aime-I".into());
        let mut q = question("a", 15, "A", "choice");
        q.localized = Some(Localized {
            zh: Some(Locale {
                solution: Some("中文解析".into()),
            }),
            en: Some(Locale {
                solution: Some("English solution".into()),
            }),
        });
        let input = Request {
            questions: vec![q],
            answers: BTreeMap::from([("a".into(), "B".into())]),
            profile,
            lang: Some("en".into()),
        };
        let g = grade(&input);
        assert_eq!(g.score, -1.25);
        assert_eq!(g.items[0].solution, "English solution");
        assert_eq!(g.items[0].concept, "official_original");
        assert_eq!(g.by_position.as_ref().unwrap()["Q11–15"].total, 1);
    }
}
