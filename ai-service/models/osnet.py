import torch
import torch.nn as nn
import torch.nn.functional as F

"""
OSNet: Omni-Scale Network for Person Re-Identification
Reference: Zhou et al. "Omni-Scale Feature Learning for Person Re-Identification", ICCV 2019.
"""

class ConvLayer(nn.Module):
    def __init__(self, in_channels, out_channels, kernel_size, stride=1, padding=0, groups=1):
        super(ConvLayer, self).__init__()
        self.conv = nn.Conv2d(in_channels, out_channels, kernel_size, stride=stride, padding=padding, bias=False, groups=groups)
        self.bn = nn.BatchNorm2d(out_channels)
        self.relu = nn.ReLU(inplace=True)

    def forward(self, x):
        return self.relu(self.bn(self.conv(x)))

class Conv1x1(nn.Module):
    def __init__(self, in_channels, out_channels, stride=1):
        super(Conv1x1, self).__init__()
        self.conv = nn.Conv2d(in_channels, out_channels, 1, stride=stride, padding=0, bias=False)
        self.bn = nn.BatchNorm2d(out_channels)
        self.relu = nn.ReLU(inplace=True)

    def forward(self, x):
        return self.relu(self.bn(self.conv(x)))

class LightConv3x3(nn.Module):
    def __init__(self, in_channels, out_channels):
        super(LightConv3x3, self).__init__()
        self.conv1 = nn.Conv2d(in_channels, out_channels, 1, bias=False)
        self.conv2 = nn.Conv2d(out_channels, out_channels, 3, padding=1, bias=False, groups=out_channels)
        self.bn = nn.BatchNorm2d(out_channels)
        self.relu = nn.ReLU(inplace=True)

    def forward(self, x):
        x = self.conv1(x)
        x = self.conv2(x)
        x = self.bn(x)
        return self.relu(x)

class ChannelGate(nn.Module):
    def __init__(self, in_channels, num_gates=None, return_gates=False, reduction=16):
        super(ChannelGate, self).__init__()
        if num_gates is None:
            num_gates = in_channels
        self.return_gates = return_gates
        self.global_avgpool = nn.AdaptiveAvgPool2d(1)
        self.fc1 = nn.Conv2d(in_channels, in_channels // reduction, 1, bias=True)
        self.relu1 = nn.ReLU(inplace=True)
        self.fc2 = nn.Conv2d(in_channels // reduction, num_gates, 1, bias=True)
        self.gate_activation = nn.Sigmoid()

    def forward(self, x):
        input_x = x
        x = self.global_avgpool(x)
        x = self.fc1(x)
        x = self.relu1(x)
        x = self.fc2(x)
        gates = self.gate_activation(x)
        if self.return_gates:
            return gates
        return input_x * gates

class OSBlock(nn.Module):
    def __init__(self, in_channels, out_channels, bottleneck_reduction=4):
        super(OSBlock, self).__init__()
        mid_channels = out_channels // bottleneck_reduction
        self.conv1 = Conv1x1(in_channels, mid_channels)
        self.conv2a = LightConv3x3(mid_channels, mid_channels)
        self.conv2b = nn.Sequential(
            LightConv3x3(mid_channels, mid_channels),
            LightConv3x3(mid_channels, mid_channels),
        )
        self.conv2c = nn.Sequential(
            LightConv3x3(mid_channels, mid_channels),
            LightConv3x3(mid_channels, mid_channels),
            LightConv3x3(mid_channels, mid_channels),
        )
        self.conv2d = nn.Sequential(
            LightConv3x3(mid_channels, mid_channels),
            LightConv3x3(mid_channels, mid_channels),
            LightConv3x3(mid_channels, mid_channels),
            LightConv3x3(mid_channels, mid_channels),
        )
        self.gate = ChannelGate(mid_channels)
        self.conv3 = Conv1x1(mid_channels, out_channels)
        self.downsample = None
        if in_channels != out_channels:
            self.downsample = Conv1x1(in_channels, out_channels)

    def forward(self, x):
        residual = x
        x1 = self.conv1(x)
        x2a = self.conv2a(x1)
        x2b = self.conv2b(x1)
        x2c = self.conv2c(x1)
        x2d = self.conv2d(x1)
        x2 = self.gate(x2a + x2b + x2c + x2d)
        x3 = self.conv3(x2)
        if self.downsample is not None:
            residual = self.downsample(residual)
        return F.relu(x3 + residual, inplace=True)

class OSNet(nn.Module):
    def __init__(self, num_classes=751, blocks=[OSBlock, OSBlock, OSBlock], layers=[2, 2, 2],
                 channels=[64, 256, 384, 512], feature_dim=512):
        super(OSNet, self).__init__()
        num_blocks = len(blocks)
        assert num_blocks == len(layers)
        assert num_blocks == len(channels) - 1

        # Stem
        self.conv1 = ConvLayer(3, channels[0], 7, stride=2, padding=3)
        self.maxpool = nn.MaxPool2d(3, stride=2, padding=1)

        # Stage 1
        self.conv2 = self._make_layer(blocks[0], layers[0], channels[0], channels[1])
        self.transition1 = nn.Sequential(
            Conv1x1(channels[1], channels[1]),
            nn.AvgPool2d(2, stride=2)
        )

        # Stage 2
        self.conv3 = self._make_layer(blocks[1], layers[1], channels[1], channels[2])
        self.transition2 = nn.Sequential(
            Conv1x1(channels[2], channels[2]),
            nn.AvgPool2d(2, stride=2)
        )

        # Stage 3
        self.conv4 = self._make_layer(blocks[2], layers[2], channels[2], channels[3])
        self.conv5 = Conv1x1(channels[3], channels[3])

        self.global_avgpool = nn.AdaptiveAvgPool2d(1)
        
        # Feature layer (512 -> 512)
        self.fc = nn.Sequential(
            nn.Linear(channels[3], feature_dim),
            nn.BatchNorm1d(feature_dim),
            nn.ReLU(inplace=True)
        )
        self.classifier = nn.Linear(feature_dim, num_classes)

    def _make_layer(self, block, num_layers, in_channels, out_channels):
        layers = []
        layers.append(block(in_channels, out_channels))
        for _ in range(1, num_layers):
            layers.append(block(out_channels, out_channels))
        return nn.Sequential(*layers)

    def forward(self, x, return_feature=True):
        x = self.conv1(x)
        x = self.maxpool(x)
        x = self.conv2(x)
        x = self.transition1(x)
        x = self.conv3(x)
        x = self.transition2(x)
        x = self.conv4(x)
        x = self.conv5(x)
        v = self.global_avgpool(x)
        v = v.view(v.size(0), -1)
        feat = self.fc(v)
        if return_feature:
            return feat
        return self.classifier(feat)

def osnet_x1_0(pretrained_path=None, **kwargs):
    model = OSNet(blocks=[OSBlock, OSBlock, OSBlock], layers=[2, 2, 2],
                  channels=[64, 256, 384, 512], feature_dim=512, **kwargs)
    if pretrained_path:
        state_dict = torch.load(pretrained_path, map_location="cpu", weights_only=False)
        if "state_dict" in state_dict:
            state_dict = state_dict["state_dict"]
        # Filter out classifier weights if class count differs
        model_dict = model.state_dict()
        filtered = {k: v for k, v in state_dict.items() if k in model_dict and model_dict[k].shape == v.shape}
        model_dict.update(filtered)
        model.load_state_dict(model_dict)
    return model
