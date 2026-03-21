from typing import Literal

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


class Problem(BaseModel):
    id: int
    type: Literal["word", "sentence"]
    english: str
    japanese: str
    level: int


class ProblemListResponse(BaseModel):
    problems: list[Problem]


PROBLEMS = [
    Problem(id=1, type="word", english="apple", japanese="りんご", level=1),
    Problem(id=2, type="word", english="library", japanese="図書館", level=1),
    Problem(id=3, type="word", english="beautiful", japanese="美しい", level=2),
    Problem(id=4, type="word", english="schedule", japanese="予定", level=2),
    Problem(id=5, type="word", english="environment", japanese="環境", level=3),
    Problem(id=6, type="word", english="important", japanese="重要な", level=1),
    Problem(id=7, type="word", english="keyboard", japanese="キーボード", level=1),
    Problem(id=8, type="word", english="teacher", japanese="先生", level=1),
    Problem(id=9, type="word", english="student", japanese="生徒", level=1),
    Problem(id=10, type="word", english="morning", japanese="朝", level=1),
    Problem(id=11, type="word", english="country", japanese="国", level=1),
    Problem(id=12, type="word", english="science", japanese="科学", level=2),
    Problem(id=13, type="word", english="picture", japanese="写真", level=1),
    Problem(id=14, type="word", english="weather", japanese="天気", level=1),
    Problem(id=15, type="word", english="holiday", japanese="休日", level=1),
    Problem(id=16, type="word", english="question", japanese="質問", level=1),
    Problem(id=17, type="word", english="answer", japanese="答え", level=1),
    Problem(id=18, type="word", english="practice", japanese="練習", level=1),
    Problem(id=19, type="word", english="because", japanese="なぜなら", level=2),
    Problem(id=20, type="word", english="through", japanese="通り抜けて", level=2),
    Problem(id=21, type="word", english="enough", japanese="十分な", level=2),
    Problem(id=22, type="word", english="thought", japanese="考え", level=2),
    Problem(id=23, type="word", english="special", japanese="特別な", level=2),
    Problem(id=24, type="word", english="language", japanese="言語", level=2),
    Problem(id=25, type="word", english="business", japanese="仕事", level=2),
    Problem(id=26, type="word", english="exercise", japanese="運動", level=2),
    Problem(id=27, type="word", english="development", japanese="開発", level=3),
    Problem(id=28, type="word", english="knowledge", japanese="知識", level=3),
    Problem(id=29, type="word", english="confidence", japanese="自信", level=3),
    Problem(id=30, type="word", english="responsible", japanese="責任がある", level=3),
    Problem(
        id=31,
        type="sentence",
        english="I drink coffee every morning.",
        japanese="私は毎朝コーヒーを飲みます。",
        level=1,
    ),
    Problem(
        id=32,
        type="sentence",
        english="She studies English after dinner.",
        japanese="彼女は夕食後に英語を勉強します。",
        level=1,
    ),
    Problem(
        id=33,
        type="sentence",
        english="We need to finish this report today.",
        japanese="私たちは今日このレポートを終える必要があります。",
        level=2,
    ),
    Problem(
        id=34,
        type="sentence",
        english="The train was delayed because of the rain.",
        japanese="雨のため電車が遅れました。",
        level=2,
    ),
    Problem(
        id=35,
        type="sentence",
        english="Please check the spelling before you submit it.",
        japanese="提出する前にスペルを確認してください。",
        level=3,
    ),
    Problem(
        id=36,
        type="sentence",
        english="Learning a language takes patience and repetition.",
        japanese="言語学習には忍耐と反復が必要です。",
        level=3,
    ),
    Problem(
        id=37,
        type="sentence",
        english="My brother plays the guitar on weekends.",
        japanese="私の兄は週末にギターを弾きます。",
        level=1,
    ),
    Problem(
        id=38,
        type="sentence",
        english="This museum opens at nine in the morning.",
        japanese="この博物館は朝9時に開きます。",
        level=1,
    ),
    Problem(
        id=39,
        type="sentence",
        english="Our team shared the meeting notes yesterday.",
        japanese="私たちのチームは昨日会議メモを共有しました。",
        level=2,
    ),
    Problem(
        id=40,
        type="sentence",
        english="He forgot his umbrella, so he got wet.",
        japanese="彼は傘を忘れたのでぬれました。",
        level=2,
    ),
    Problem(
        id=41,
        type="sentence",
        english="Typing slowly can improve your accuracy at first.",
        japanese="最初はゆっくり打つと正確さが上がります。",
        level=3,
    ),
    Problem(
        id=42,
        type="sentence",
        english="Small daily habits often create meaningful progress.",
        japanese="小さな毎日の習慣が大きな前進を生みます。",
        level=3,
    ),
]


app = FastAPI(title="Typing App API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/problems", response_model=ProblemListResponse)
def get_problems() -> ProblemListResponse:
    return ProblemListResponse(problems=PROBLEMS)
