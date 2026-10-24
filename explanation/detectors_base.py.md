# rpkclust/detectors/base.py

Context dataclass: `messages:List[Message]`, `offset:int`, `capture_range:Tuple[float,float]`, `pairs:List[Pair]`, `config:Config`.
Detector Protocol: `name: str`, `lengths: Tuple[int,...]`, `check(slices:List[bytes], ctx:Context) -> Optional[Hit]`. Hit fields: `rule`, `offset`, `length`, `info`. Base class for all semantic detectors; provides shared structure for detector registration and boundary scanning.